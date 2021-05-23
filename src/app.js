/**
 * Plug-in providing simplified custom web components functionality.
 * 
 * (c) Thassilo Martin Schiepanski
 */

const config = {
	componentNamePrefix: "RapidComponent_",
	hideStyleElementId: "rapid--hide",
	instanceIndicator: "rapid--",
	requestEndpoint: "_components",
	shadowRootAlias: "COMPONENT"
};

const {existsSync, readdirSync, readFileSync} = require("fs");
const {join} = require("path");

// Components data object containing each component in a map.
let componentsData;

function readComponentsData(coreInterface) {
	const useResponseModifier = coreInterface.getFromConfig("applyResponseModifiers");
	const applyResponseModifier = (extension, data) => {
		return (useResponseModifier === true) ? coreInterface.applyResponseModifier(extension, data): data;
	};

	/**
     * Retrieve file contents of a certain component file from a given directory.
     * @param {String} componentDirPath Component direcotry path
     * @param {String} extension File extension to read
     * @param {Boolean} [applyResponseModifier=true] Whether to apply response modifier
     * @returns {Object} Component file data object
     */
	const retrieveComponentSubData = (componentDirPath, extension, useResponseModifier = true) => {
		const subPath = `${componentDirPath}.${extension}`;
		if(existsSync(subPath)) {
			let data;
			try {
				data = String(coreInterface.applyReader(extension, subPath));
			} catch(err) {
				if(err !== 404) {
					throw err;
				}

				data = String(readFileSync(subPath)).trim();
			}
			
			if(data.length == 0) {
				return null;
			}

			return useResponseModifier ? applyResponseModifier(extension, data) : data;
		}
		return null;
	};
	/**
     * Translate simplified script syntax to valid ECMA script syntax.
     * @helper
     * @param {String} script Simplified syntax script
     * @returns {String} Valid syntax script
     */
	const translateScript = script => {
		/**
		 * Extract a code block ({}) from script.
		 * @helper
		 * @param {Number} script Script to extract block from
		 * @param {String} startIndex Index of block head in script
		 * @returns {String} Extracted block
		 */
		const extractBlock = (script, startIndex) => {
			let open = 1;
			let block = script.slice(startIndex);
			let endIndex = block.indexOf("{") + 1;
			let openedString = null;

			do {
				let character = block.slice(endIndex).match(/([^\\]("|`|'))|\{|\}/)[0];
				endIndex += block.slice(endIndex).indexOf(character) + 2;
				character = (character.length > 1) ? character.slice(1) : character;
				
				if(openedString) {
					(openedString == character) && (openedString = null);
					continue;
				}
				if(character == "{") {
					open++;
					continue;
				}
				if(character == "}") {
					open--;
					continue;
				}
				openedString = character;
			} while(open > 0);
			
			return script.slice(startIndex, startIndex + endIndex);
		};
		
		const scriptTranslation = {
			lifecyclePrefix: "::",
			lifecycle: {
				"connectedCallback": "connected",
				"disconnectedCallback": "disconnected",
				"adoptedCallback": "moved"
			},
			attributeChangedCallback: {
				name: "addChangeListener",
				oldValueName: "oldValue",
				newValueName: "newValue",
			},
			loadHandlerName: "::initialized"
		};

		// Remove comments
		script = script.replace(/((^|([^\\]))\/\/.*)|((^|[^\\])\/\*((?!\*\/)(\s|.))*(\*\/)?)/g, "$3");

		// Translate lifecycle methods
		for(let key in scriptTranslation.lifecycle) {
			script = script.replace(new RegExp(`(^|\\s)${scriptTranslation.lifecyclePrefix}${scriptTranslation.lifecycle[key]}\\s*\\(`, "g"), `$1${key}(`);
		}

		// Translate attribute change listeners
		let listenerCases = "";
		let listenedAttributes = [];
		let startIndex;
		while((startIndex = script.search(new RegExp(`(^|\\s)${scriptTranslation.attributeChangedCallback.name}\\s*\\(`))) > -1) {    // TODO: Extend regex?
			const listener = extractBlock(script, startIndex);
			
			script = script.replace(new RegExp(`${listener.replace(/(\[|\]|\{|\}|\(|\)|\.)/g, "\\$1")}(\\s*\\)(\\s*;)?)?`), ""); // Remove listener from script to prevent endless recursion by getting scanning again

			const attribute = listener.match(/("|'|`)\s*[a-zA-Z0-9_-]+\s*\1/)[0].slice(1, -1).trim();
			let body = listener.slice(listener.indexOf("{") + 1, -1).trim();

			let args = listener.slice(0, listener.indexOf("{")).match(/[a-zA-Z_][a-zA-Z0-9_]*\s*=>|\(\s*[a-zA-Z_][a-zA-Z0-9_]*(\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*\s*\)/);
			if(args) {
				args = args[0].match(/[a-zA-Z_][a-zA-Z0-9_]*/g);
                
				body = body.replace(new RegExp(`([^a-zA-Z0-9_])${args[0]}([^a-zA-Z0-9_])`), `$1${scriptTranslation.attributeChangedCallback.oldValueName}$2`);
				args[1] && (body = body.replace(args[1], scriptTranslation.attributeChangedCallback.newValueName));
			}

			listenerCases += `
                case "${attribute}":
                    ${body}
                    break;
            `;

			listenedAttributes.push(attribute);
		}

		(listenerCases.length > 0) && (script += `
            attributeChangedCallback(attr, ${scriptTranslation.attributeChangedCallback.oldValueName}, ${scriptTranslation.attributeChangedCallback.newValueName}) {
                switch(attr) {
                    ${listenerCases}
                }
            }
            static get observedAttributes() {return [${listenedAttributes.map(attr => `"${attr}"`).join(",")}];}
        `);

		// Extract load handler if defined
		let loadHandler;
		if((startIndex = script.search(new RegExp(`(^|\\s)${scriptTranslation.loadHandlerName}\\s*\\(`))) > -1) {
			loadHandler = extractBlock(script, startIndex).trim();
			script = script.replace(loadHandler, "");

			loadHandler = loadHandler.slice(loadHandler.indexOf("{") + 1, -1).trim();
		}

		return {
			native: script,
			loadHandler: loadHandler,
		};
	};

	let data = new Map();

	const componentsDirPath = join(coreInterface.webPath, coreInterface.getFromConfig("componentsDirPath"));
	existsSync(componentsDirPath) && readdirSync(componentsDirPath, {
		withFileTypes: true
	})
		.filter(dirent => (dirent.isDirectory() && /^[a-z0-9_-]+$/i.test(dirent.name)))
		.forEach(dir => {
			const name = dir.name.toLowerCase();
			if(data.has(name)) {
				return;	// Do not read duplicates
			}

			// Process each component as present in file system
			const componentDirPath = join(componentsDirPath, name, `_${name}`);
        
			const markup = retrieveComponentSubData(componentDirPath, "html");
			if(!markup) {
				coreInterface.output.log(`Skipping render of '${name}' component as mandatory markup file does not exist or is empty`);
				return;
			}

			let style = retrieveComponentSubData(componentDirPath, "css");
			!style && (style = retrieveComponentSubData(componentDirPath, "scss")); // Try SCSS if no related CSS file found

			let script = retrieveComponentSubData(componentDirPath, "js", false);
			if(script) {
				script = translateScript(script);
				console.log(script)
				script.native = applyResponseModifier("js", script.native);
				script.loadHandler = applyResponseModifier("js", script.loadHandler);
				console.log(script)
			};
			
			
			const subData = {
				markup: markup,
				style: style,
				script: script
			};

			if(Object.keys(subData).length === 0) {
				return;
			}

			data.set(name.toLowerCase(), subData);
		});

	return data;

	// TODO: Minify?
}

// TODO: Introduce directives (e.g. for disabling a feature on a certain page)?

module.exports = coreInterface => {
	coreInterface.initFrontendModule(config);

	// TODO: Add invisible element to component instance wrapping elements to already reserve space?

	// Add POST route to retrieve specific content
	coreInterface.setRoute("post", `/${config.requestEndpoint}`, body => {
		if(coreInterface.getFromConfig("devMode") || !componentsData) {
			// Read components data on first request as readers and finalizers would not be set up on initial read
			componentsData = readComponentsData(coreInterface);
		}

		if(componentsData.size == 0 || !body.components || !Array.isArray(body.components) || body.components.length == 0) {
			return null;
		}

		let selectedComponentsData = {};
		Array.from(new Set(body.components)).map(component => component.trim().toLowerCase()).forEach(component => {
			const data = componentsData.get(component);
			if(!data) {
				return;
			}

			selectedComponentsData[component] = data;
		});

		return selectedComponentsData;
	});
};