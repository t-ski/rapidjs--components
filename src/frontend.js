/*global config*/

let componentes = new Map();

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

	(componentInstances.length > 0) && RAPID.core.post(config.requestEndpoint, {
		components: componentInstances
	})
		.then(res => res.json())
		.then(components => {
		// Implement components accordingly
			for(let name in components) {
				const component = components[name];
				const instanceName = `${config.instanceIndicator}${name}`;

				const template = document.createElement("template");
				template.id = instanceName;
				template.innerHTML = `${component.style ? `<style>${component.style}</style>` : ""}${component.markup}`;

				document.head.appendChild(template);
		
				const className = `${config.componentNamePrefix}${componentes.size}`;
				try {
					eval(`
				class ${className} extends HTMLElement {
					constructor() {
						super();

						this.${config.shadowRootAlias} = this.attachShadow({mode: "closed"});
						this.${config.shadowRootAlias}.appendChild(document.querySelector("template#${instanceName}").content.cloneNode(true));
					}
					${component.script || ""}
				}
				componentes.set("${name}", ${className});
				customElements.define("${instanceName}", ${className});
			`);
				} catch(err) {
					throw new EvalError(`An error occurred creating a component:\n"${err.message}" at '_${name}.js'`);
				}
			}

			// Dispatch components loaded event for possible reactions
			const event = new Event(config.componentsLoadedEventName);
			document.dispatchEvent(event);
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
module.component = name => {
	name = name.replace(new RegExp(`^${config.instanceIndicator}`), "");
	return componentes.get(name.toLowerCase());
};