const config = {
    instanceIndicator: "rapid--",
	moduleName: "components",
    requestEndpoint: "_components"
};

const {existsSync, readdirSync, readFileSync} = require("fs");
const {join} = require("path");

// Components data object containing each component in a map.
let componentsData = new Map();

/**
 * Render components into markup data accordingly.
 * @param {String} data Markup data
 * @returns {String} Markup with components rendered into
 */
function render(data) {
	return data;
}

function init(coreAppInstance) {
    coreAppInstance.initFeatureFrontend(__dirname, config.moduleName, config);

    // Read components directory
    const retrieveComponentSubData = (componentDirPath, extension) => {
        return coreAppInstance.finish(extension, existsSync(`${componentDirPath}.${extension}`) ? String(readFileSync(`${componentDirPath}.${extension}`)).trim() : null);
    };

    const componentsDirPath = join(coreAppInstance.webPath(), coreAppInstance.config("componentsDirPath"));
    existsSync(componentsDirPath) && readdirSync(componentsDirPath, {
        withFileTypes: true
    })
    .filter(dirent => (dirent.isDirectory() && /^[a-z0-9_-]+$/i.test(dirent.name)))
    .forEach(dir => {
        const componentDirPath = join(componentsDirPath, dir.name, `_${dir.name}`);
        
        const markup = retrieveComponentSubData(componentDirPath, "html");
        if(!markup || markup.length == 0) {
            coreAppInstance.log(`Skipping render of '${dir.name}' component as mandatory markup file does not exist or is empty`);
            return;
        }
        const style = retrieveComponentSubData(componentDirPath, "css");
        const script = retrieveComponentSubData(componentDirPath, "js");

        componentsData.set(dir.name, {
            markup: markup,
            style: style,
            script: script
        });
    });

    // Add render finisher
	coreAppInstance.finisher("html", render);
    
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