const config = {
    instanceIndicator: "rapid--",
	moduleName: "components",
    requestEndpoint: "_components"
};

const {existsSync, readdirSync, readFileSync} = require("fs");
const {join} = require("path");

// Components data object containing each component in a map.
let componentsData = new Map();

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
    }

};

function init(coreAppInstance) {
    coreAppInstance.initFeatureFrontend(__dirname, config.moduleName, config);

    // Read components directory
    /**
     * Retrieve file contents of a certain component file from a given directory.
     * @param {String} componentDirPath Component direcotry path
     * @param {String} extension File extension to read
     * @returns {String} Component file data
     */
    const retrieveComponentSubData = (componentDirPath, extension) => {
        if(existsSync(`${componentDirPath}.${extension}`)) {
            const data = String(readFileSync(`${componentDirPath}.${extension}`)).trim();
            if(data.length == 0) {
                return null;
            }

            return coreAppInstance.finish(extension, data);
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
            let open = 1;
            let block = script.slice(startIndex);
            let endIndex = block.indexOf("{") + 1;
            let openedString = null;
            do {
                const character = block.slice(endIndex).match(/([^\\]("|`|'))|\{|\}/)[0];
                endIndex += block.slice(endIndex).indexOf(character) + 1;
                if(character == "{") {
                    open++;
                    continue;
                }
                if(character == "}") {
                    open--;
                    continue;
                }
                if(["\"", "'", "`"].includes(character.slice(1))) {
                    if(openedString === null) {
                        openedString = character;
                    } else if(character == openedString) {
                        openedString = null;
                    }
                    continue;
                }
            } while(open > 0);
            
            const listener = script.slice(startIndex, startIndex + endIndex);
            script = script.replace(new RegExp(`${listener.replace(/(\{|\}|\(|\))/g, "\\$1")}(\\s*\\)(\\s*;)?)?`), "");

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
        
        script += `
            attributeChangedCallback(attr, ${scriptTranslation.attributeChangedCallback.oldValueName}, ${scriptTranslation.attributeChangedCallback.newValueName}) {
                switch(attr) {
                    ${listenerCases}
                }
            }
            static get observedAttributes() {return [${listenedAttributes.map(attr => `"${attr}"`).join(",")}];}
        `;
            
        return script;
    };

    const componentsDirPath = join(coreAppInstance.webPath(), coreAppInstance.config("componentsDirPath"));
    existsSync(componentsDirPath) && readdirSync(componentsDirPath, {
        withFileTypes: true
    })
    .filter(dirent => (dirent.isDirectory() && /^[a-z0-9_-]+$/i.test(dirent.name)))
    .forEach(dir => {
        // Process each component as present in file system
        const componentDirPath = join(componentsDirPath, dir.name, `_${dir.name}`);
        
        const markup = retrieveComponentSubData(componentDirPath, "html");
        if(!markup) {
            coreAppInstance.log(`Skipping render of '${dir.name}' component as mandatory markup file does not exist or is empty`);
            return;
        }

        let style = retrieveComponentSubData(componentDirPath, "css");
        !style && (style = retrieveComponentSubData(componentDirPath, "scss")); // Try SCSS if no related CSS file found

        let script = retrieveComponentSubData(componentDirPath, "js");
        script && (script = translateScript(script));

        componentsData.set(dir.name, {
            markup: markup,
            style: style,
            script: script
        });
    });

	// Add POST route to retrieve specific content
	coreAppInstance.route("post", `/${config.requestEndpoint}`, body => {
        if(!body.components || !Array.isArray(body.components) || body.components.length == 0) {
			return null;
		}
        
		let selectedComponentsData = {};
        body.components.forEach(component => {
            if(!componentsData.has(component)) {
                return;
            }

            selectedComponentsData[component] = componentsData.get(component);
        });

        if(Object.keys(selectedComponentsData).length === 0) {
            return null;
        }
		return selectedComponentsData;
	});
}

module.exports = init;