/*global config*/

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
            
            try {
                eval(`
                    customElements.define("${instanceName}", class extends HTMLElement {
                        constructor() {
                            super();

                            this.${config.shadowRootAlias} = this.attachShadow({mode: "closed"});
                            this.${config.shadowRootAlias}.appendChild(document.querySelector("template#${instanceName}").content.cloneNode(true));
                        }
                        ${component.script || ""}
                    });
                `);
            } catch(err) {
                throw new EvalError(`An error occurred executing a component script:\n"${err.message}" at '_${name}.js`);
            }
        }
    });
})).observe(document, {
    subtree: true,
    childList: true
});