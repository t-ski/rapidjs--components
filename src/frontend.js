let componentes = new Map();

window.MutationObserver || window.WebKitMutationObserver;
(new MutationObserver(mutations => {
	// Retrieve added custom component instance types
	let componentInstances = new Set();
	mutations.forEach(mutation => {
		mutation.addedNodes.forEach(node => {
			if(!(new RegExp(`^${config.instanceIndicator}[a-z0-9_-]+$`, "i")).test(node.tagName)) {
				return;
			}
			componentInstances.add(node.tagName.toLowerCase());
		});
	});
	
	if(componentInstances.size == 0) {
		// Exit if no custom component instance found
		return;
	}
	
	componentInstances = Array.from(componentInstances);
	componentInstances = componentInstances.filter(instance => {
		return (document.createElement(instance).constructor === HTMLElement);
	});
	if(componentInstances.length == 0) {
		return;
	}

	// Create a hide style tag in order to prevent bare component markup to render before its styles having been loaded and parsed
	const hideStyleElement = document.createElement("style");
	hideStyleElement.textContent = `${componentInstances.join(", ")} { visibility: hidden !important; }`;
	hideStyleElement.id = config.hideStyleElementId;
	document.head.appendChild(hideStyleElement);

	// Request collected component related data
	RAPID.core.post(config.requestEndpoint, {
		components: componentInstances.map(component => component.replace(new RegExp(`^${config.instanceIndicator}`), ""))	// Send names without instance prefix
	})
		.then(res => res.json())
		.then(components => {
		// Implement components accordingly
			for(let name in components) {
				const component = components[name];
				const instanceName = `${config.instanceIndicator}${name}`;

				const template = document.createElement("template");
				template.innerHTML = `${component.style ? `<style>${component.style}</style>` : ""}${component.markup}`;

				document.head.appendChild(template);
		
				const className = `${config.componentNamePrefix}${componentes.size}`;
				try {
					eval(`
						class ${className} extends HTMLElement {
							constructor() {
								super();

								this.${config.shadowRootAlias} = this.attachShadow({mode: "closed"});
								this.${config.shadowRootAlias}.appendChild(document.head.lastChild.content.cloneNode(true));
							}
							${component.script || ""}
						}
						componentes.set("${name}", ${className});
						customElements.define("${instanceName}", ${className});
					`);
				} catch(err) {
					// TODO: Improve error messages (parse backend-side?)
					throw new EvalError(`An error occurred creating a component:\n"${err.message}" at '_${name}.js'`);
				}
			}

			// Dispatch components loaded event for possible reactions
			const event = new Event(config.componentsLoadedEventName);
			document.dispatchEvent(event);

			// Remove hide style element as component styles all loaded
			// Use timeout as no there is no way to check if styles already passed, but small delay common?
			//setTimeout(_ => { 
			document.head.removeChild(document.head.querySelector(`style#${config.hideStyleElementId}`));
			//}, 0);
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