const config = {
    instanceIndicator: "rapid--",
	moduleName: "components",
    requestEndpoint: "_components"
};

const {existsSync, readdirSync, readFileSync} = require("fs");
const {join} = require("path");

// Components data object containing each component in a map.
let componentsData = new Map();

const translation = {
    "connectedCallback": "connected",
    "disconnectedCallback": "disconnected",
    "adoptedCallback": "moved"
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
        // Translate lifecycle methods
        for(let key in translation) {
            script = script.replace(new RegExp(`(^|\\s)::${translation[key]}\\s*\\(`, "g"), `$1${key}(`);
        }

        // Translate ordinary methods
        script = script.replace(/(^|\}|\s)((const|let|var)|function)\s+([a-zA-Z_][a-zA-Z_0-9]*)(\s*=\s*function)?\s*\(/g, "$1$4(");
        script = script.replace(/(^|\}|\s)(const|let|var)\s+([a-zA-Z_][a-zA-Z_0-9]*)\s*=\s*(_|(([a-zA-Z_][a-zA-Z_0-9]*)|\((((?!\))(\s|.))*)\)))\s*=>/g, "$1$3($6$7)");

        // TODO: How to handle private vars?

        return script;
    };

    const componentsDirPath = join(coreAppInstance.webPath(), coreAppInstance.config("componentsDirPath"));
    existsSync(componentsDirPath) && readdirSync(componentsDirPath, {
        withFileTypes: true
    })
    .filter(dirent => (dirent.isDirectory() && /^[a-z0-9_-]+$/i.test(dirent.name)))
    .forEach(dir => {
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