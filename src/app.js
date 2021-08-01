/**
 * Plug-in providing simplified custom web components functionality.
 * 
 * (c) Thassilo Martin Schiepanski
 */

const config = {
	componentNamePrefix: "RapidComponent_",
	hideStyleElementId: "hide",
	instanceIndicator: "component--",
	maxTagNameLength: 250,
	shadowRootAlias: "COMPONENT"
};

const {join} = require("path");

function readComponentData(rapidJS, component) {
	/**
     * Retrieve file contents of a certain component filåe from a given directory.
     * @param {String} componentDirPath Component direcotry path
     * @param {String} extension File extension to read
     * @returns {Object} Component file data object
     */
	const retrieveComponentSubData = (componentDirPath, extension) => {
		const subPath = `${componentDirPath}.${extension}`;
		let data;
		try {
			data = String(rapidJS.readFile(subPath));
		} catch(err) {
			console.error(err);

			return null;
		}
		
		if(data.length == 0) {
			return null;
		}

		return data;
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

	let componentsDirPath = rapidJS.readConfig("componentsDirPath");
	if(!componentsDirPath) {
		console.log("No components directory path given in config file (\"components.componentsDirPath\")");
		
		return;
	}

	const componentDirPath = join(componentsDirPath, component, `_${component}`);

	const markup = retrieveComponentSubData(componentDirPath, "html");
	if(!markup) {
		console.log(`Skipping render of '${component}' component as mandatory markup file does not exist or is empty`);
		return;
	}

	let style = retrieveComponentSubData(componentDirPath, "css");
	
	let script = retrieveComponentSubData(componentDirPath, "js", false);
	if(script) {
		script = translateScript(script);
	}
	
	const data = {
		markup: markup,
		style: style,
		script: script
	};

	if(Object.keys(data).length === 0) {
		return;
	}

	return data;

	// TODO: Provide minification option (as script might not work with conventional minification algorithms)?
}

// TODO: Implement apply response modifier disable directive for single files?
// TODO: Introduce directives (e.g. for disabling a feature on a certain page)?

module.exports = rapidJS => {
	rapidJS.initFrontendModule("./frontend", config);

	// TODO: Add invisible element to component instance wrapping elements to reserve space nbefore styles have loaded?
	
	const cache = rapidJS.createCache();

	// Add POST route to retrieve specific content
	rapidJS.setEndpoint(body => {
		if(!body.components
		|| !Array.isArray(body.components)
		|| body.components.length == 0) {
			return null;
		}
		
		const data = {};
		Array.from(new Set(body.components))
			.filter(component => {
				return (component.length <= config.maxTagNameLength);
			})
			.map(component => component.trim().toLowerCase())
			.forEach(component => {
				let subData;
				if(cache.has(component)) {
					subData = cache.readFile(component);
				} else {
					subData = readComponentData(rapidJS, component);

					if(!subData) {
						return;
					}

					cache.write(component, subData);
				}

				data[component] = subData;
			});
		
		return data;
	});
};