/*global config*/

let componentClasses = new Map();

window.MutationObserver || window.WebKitMutationObserver;
(new MutationObserver(mutations => {
    let componentInstances = [];
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if(!(new RegExp(`^${config.instanceIndicator}[a-z0-9_-]+$`, "i")).test(node.tagName)) {
                return;
            }
            
            componentInstances.push(node.tagName.toLowerCase().replace(new RegExp(`^${config.instanceIndicator}`), ""));
        });
    });

    (componentInstances.length > 0) && module.post(config.requestEndpoint, {
        components: componentInstances
    })
    .then(res => res.json())
    .then(components => {
        for(let name in components) {
            const component = components[name];
            const instanceName = `${config.instanceIndicator}${name}`;

            const template = document.createElement("template");
            template.id = instanceName;
            template.innerHTML = `${component.style ? `<style>${component.style}</style>` : ""}${component.markup}`;

            document.head.appendChild(template);
            
            const className = `${config.componentClassNamePrefix}${componentClasses.size}`;
            try {
                eval(`
                    class ${className} extends HTMLElement {
                        constructor() {
                            super();

                            this.${config.shadowRootAlias} = this.attachShadow({mode: "closed"});
                            this.${config.shadowRootAlias}.appendChild(document.querySelector("template#${instanceName}").content.cloneNode(true));
                        }
                        ${component.script || ""}
                    }
                    componentClasses.set("${name}", ${className});
                    customElements.define("${instanceName}", ${className});
                `);
            } catch(err) {
                throw new EvalError(`An error occurred executing a component script:\n"${err.message}" at '_${name}.js'`);
            }
        }
    });
})).observe(document, {
    subtree: true,
    childList: true
});

/**
 * Retrieve a component class name reference (e.g. for accessing static members).
 * @param {String} name Component name
 * @returns {Class} Component class reference
 */
module.componentClass = name => {
    name = name.replace(new RegExp(`^${config.instanceIndicator}`), "");
    return componentClasses.get(name.toLowerCase());
};