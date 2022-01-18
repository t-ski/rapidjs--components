# components

<a href="https://rapidjs.org"><img src="https://rapidjs.org/assets/readme-plugin-badge.svg" height="75"></a>

Providing abstract web components functionality for creating individual, self-contained elements to be reused among markup documents.

```
npm install @t-ski/rapidjs--components
```

## Concept

The plug-in provides an abstraction wrapper around the [web components standard](https://www.webcomponents.org/introduction#specifications), thus inducing a simplified usage environment. Effectively, a valid web component represents an extension of the HTML element set. I.e. web components are to be used just like ordinary HTML elements.

---

## Specific component directory

Each component is to be organized in its own directory containing component related files. The directory name corresponds to the tag name the component is to be instanciated within web page markup, prefixed by the rapidJS component indicator `component-`. All component files inside of a component directory must be named just like the respective component directory.

## Markup file

A file (*.html*) stating standard markup to compose the component's blackboxed interface. A component markup file is required in order to receive a working component.

### Slotted content

To tell the custom component where to place inner HTML passed to a related instance, use slot tags. The slotted content behavior and any related functionality (such as styling slotted elements) completely resembles the standard behavior.\
\
Read more about [component markup and slots](https://www.webcomponents.org/specs#the-shadow-dom-specification).

## Styles file

Optionally, a styles file (*.css*) may be set up to give individual styling to the provided markup.\
\
The plug-in also works with.scss files instead, utilizing a respectively set up explicit reader to transpile *SCSS* to browser-valid *CSS* code. Do ot use *SCSS* for styling if no transpilation mechanism (explicit reader or response modifier) has been set up.

## Script file

The optional script file provides an interface for giving a component individual state space. A script file provides a private scope, representing the component class environment.

### Lifecycle

Act upon lifecycle events by intercepting them in orde to run a custom script in acallback. State the callback linked to the related event as follows:

``` js
::<lifecycle-event> {
    // Custom script
}
```

#### Events

`connected`     *Fires once a component instance has been connected to the DOM*

`disconnected`  *Fires once a component instance has been disconnected from the DOM*

`moved`         *Fires once a component instance has been moved*

#### Connected

Fires once a component instance has been connected to the DOM.

### Methods

Methods are to be created by simply giving a name followed by an argument list and the function scoped body:

``` js
methodName(arguments) {
    // Custom script
}
```

Any method is publicly accessible from and bound to component instance objects.

### this keyword

The keyword `this` within lifecycle event interceptors and methods gives a reference to the related compoenent instance.

### Component DOM

In order to manipulate the component specific DOM constructed based on the component markup, use the `COMPONENT`identifier on a related instance (e.g. `this.COMPONENT.querySelector("button").style.display = "block";`).

### Attribute change listeners

As the graphical interface of a component instance might depend on its attribute values, listening to attribute changes can be achieved using attribute change listeners by the following concept:

``` js
addChangeListener("attrbute-name", (oldValue, newValue) => {
    // Custom script
});
```

State the respective name and a callback getting passed the attribute value prior to and after the change to be triggered upon each attribute change.

---

## General components directory

All component specific directories are to be placed in a dedicated components directory. Define the path to that directory in the components feature specific configuration file scope as follows: 

``` js
"plug-in"."components"."componentsDirPath": "./_components"
```

---

## Retrieve component class reference

Sometimes it might be helpful to have a reference to a component class, e.g. for accessing static members. The component interface provides a way to retrieve a certain reference.

#### Syntax

```
 PUBLIC.component(name)
```

#### Parameter

**name** `String`   *Component (tag) name*

#### Return value

`Class` *Component class reference*

## Best practices

[Hiding component instances with noscript elements in order to visually intercept no-script-environments](https://gist.github.com/t-ski/a51394acb91dc04103e104597b17b3a8)