const config = {
	moduleName: "components",
    requestEndpoint: "_components"
};

const {existsSync, readdirSync, readFileSync} = require("fs");
const {join} = require("path");

let componentsData;

/**
 * Render components into markup data accordingly.
 * @param {String} data markup data
 * @returns {String} Markup with components rendered into
 */
function render(data) {
	return data;
}

function init(coreAppInstance) {
    coreAppInstance.initFeature(__dirname, config.moduleName, config);

    // Read components directory
    const componentsDirPath = join(coreAppInstance.webPath(), coreAppInstance.config("componentsDir"));
    if(existsSync(componentsDirPath)) {
        readdirSync(componentsDirPath, {
            withFileTypes: true
        })
        .filter(dirent => (dirent.isDirectory() && /^[a-z0-9_-]+$/i.test(dirent.name)))
        .forEach(dir => {
            const componentDirPath = join(componentsDirPath, dir.name);

            //const style = readFileSync();

            /* coreAppInstance.route("get", componentDirPath, _ => {
                throw 403;
            }); */
        });
    }

    // Add render finisher
	coreAppInstance.finish("html", data => {
        return render(data, coreAppInstance);
    });
    
	// Add POST route to retrieve specific content
	coreAppInstance.route("post", `/${config.requestEndpoint}`, body => {
		if(!body.content) {
			body.content = config.defaultContentName;
		}

		const contentFilePath = join(coreAppInstance.webPath(), body.pathname, `:${body.content}.html`);
		if(!existsSync(contentFilePath)) {
			throw 404;
		}

		return String(readFileSync(contentFilePath));
	});
}

module.exports = init;