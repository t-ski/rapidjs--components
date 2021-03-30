/*global config*/

addEventListener("load", _ => { // Wrap in load listener as not to observe initial changes
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
        .then(data => {
            console.log(data);
        });
    })).observe(document, {
        subtree: true,
        childList: true
    });
});