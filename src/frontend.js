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
            name = `${config.instanceIndicator}${name}`;

            const template = document.createElement("template");
            template.id = name;
            template.innerHTML = component.markup;

            if(component.style) {
                const style = document.createElement("style");
                style.textContent = component.style;
                template.insertBefore(style, template.firstChild);
            }

            document.head.appendChild(template);
            
            eval(`
                customElements.define("${name}", class extends HTMLElement {
                    constructor() {
                        super();

                        const shadowRoot = this.attachShadow({mode: "closed"});
                        shadowRoot.appendChild(document.querySelector("template#${name}").content.cloneNode(true));
                    }
                    ${component.script}
                });
            `);
        }
    });
})).observe(document, {
    subtree: true,
    childList: true
});