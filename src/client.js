const config = {
	componentNamePrefix: "RapidComponent_",
	hideStyleElementId: "hide",
	instanceIndicator: "component--",
	shadowRootAlias: "COMPONENT"
};


document.addEventListener("DOMContentLoaded", e => {
	e.preventDefault();
});

// TODO: Utilize/implement preload for components?
window.MutationObserver || window.WebKitMutationObserver;
(new MutationObserver(mutations => {
	// Retrieve added custom component instance types
	let componentInstances = new Set();
	mutations.forEach(mutation => {
		mutation.addedNodes.forEach(node => {
			if(node.tagName && (node.tagName.length > config.maxTagNameLength)	// Do not process components with too long (tag) names
			|| !(new RegExp(`^${config.instanceIndicator}[a-z0-9_-]+$`, "i")).test(node.tagName || "")) {
				return;
			}

			componentInstances.add(node.tagName.toLowerCase());
		});
	});

	componentInstances = Array.from(componentInstances);
	componentInstances = (componentInstances || []).filter(instance => {
		return (document.createElement(instance).constructor === HTMLElement);
	});

	if(componentInstances.length == 0) {
		// Exit if no custom component instance found
		return;
	}

	// Create a hide style tag in order to prevent bare component markup to render before its styles having been loaded and parsed
	const hideStyleElement = document.createElement("style");
	hideStyleElement.textContent = `${componentInstances.join(", ")} { visibility: hidden !important; }`;
	hideStyleElement.id = config.hideStyleElementId;
	document.head.appendChild(hideStyleElement);
	
	// Request collected component related data
	$this.endpoint({
		components: componentInstances.map(component => component.replace(new RegExp(`^${config.instanceIndicator}`), ""))	// Send names without instance prefix
	})
		.then(components => {
			// Implement components accordingly
			for(let name in components) {
				const component = components[name];
				const instanceName = `${config.instanceIndicator}${name}`;

				const template = document.createElement("template");
				template.innerHTML = `${component.style ? `<style>${component.style}</style>` : ""}${component.markup}`;

				document.head.appendChild(template);
			
				const className = `${config.componentNamePrefix}${components.size}`;
				try {
					eval(`
					class ${className} extends HTMLElement {
						constructor() {
							super();

							this.${config.shadowRootAlias} = this.attachShadow({mode: "closed"});
							this.${config.shadowRootAlias}.appendChild(document.head.lastChild.content.cloneNode(true));
						}
						${component.script.native || ""}
					}
					componentClassReferences.set("${name}", ${className});
					customElements.define("${instanceName}", ${className});
				`);
				
					// Call component load handler if provided
					component.script.loadHandler && window.eval(component.script.loadHandler);
				} catch(err) {
				// TODO: Improve error messages (parse backend-side?)
					console.error(new EvalError(`An error occurred creating a component:\n"${err.message}" at '_${name}.js'`));
				}
			}

			// Remove hide style element as component styles all loaded
			// Use timeout as no there is no way to check if styles already passed, but small delay common?
			//setTimeout(_ => { 
			document.head.removeChild(document.head.querySelector(`style#${config.hideStyleElementId}`));
			//}, 0);

			// Scroll to anchor if given (as dimensions changed)
			if(document.location.hash) {
				const anchorElement = document.querySelector(`#${document.location.hash.replace(/^#/, "")}`);

				let i = 0;
				const anchorScrollInterval = setInterval(_ => {
					anchorElement.scrollIntoView();
					i++;
					if(i >= 10) {
						clearInterval(anchorScrollInterval);
					}
				}, 25);
			}
		}).catch(_ => {
		// ...
		});
})).observe(document, {
	subtree: true,
	childList: true
});


const componentClassReferences = new Map();


/**
 * Retrieve a component class name reference (e.g. for accessing static members).
 * @param {String} name Component (tag) name
 * @returns {Class} Component class reference
 */
$this.PUBLIC.component = name => {
	name = name.replace(new RegExp(`^${config.instanceIndicator}`), "");
	return componentClassReferences.get(name.toLowerCase());
};