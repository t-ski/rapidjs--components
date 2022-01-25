# components

<a href="https://rapidjs.org"><img src="https://rapidjs.org/assets/readme-plugin-badge.svg" height="75"></a>

Custom web components as self-contained elements via code unit decoupled source files.

```
npm install @t-ski/rapidjs--components
```

## Concept

The Plug-in implements an abstraction wrapper around the [web components standard](https://www.webcomponents.org/introduction#specifications). Effectively, a valid web component represents an extension of the HTML element set, i.e. it can be used just like an ordinary HTML element.

## Component specific directory

Each component is to be organized within its own directory containing the files relevant for construction. The directory name corresponds to the element name. All component files inside of a component directory must be named just like the respective component directory, but marked private.

## Component collection directory

All component specific directories are to be placed in a surrounding, dedicated components directory. It is mandatory to define the path to that directory in the Plug-in config file as follows: 

``` js
"@t-ski/rapidjs--components"."componentsDirPath": <path-to-directory>
```

## Markup instances

As pointed out, a custom web component behaves just like ordinary HTML elements. Thus a component can be instanciated within a web page's markup placing a respective tag: Give the component name prefixed by the mandatory component indicator `component--`.

#### Example

``` html
<body>
	<component--weather degree="32"></component--weather>
</body>
```

> Custom components strictly represent non-singleton elements.

## Markup file

A file `.html` stating standard markup to compose the component's blackboxed interface. A component markup file is required in order to receive a working component.

### Slotted content

To tell the custom component where to place inner HTML passed to a related instance, use slot tags. The slotted content behavior and any related functionality (such as styling slotted elements) completely resembles the standard behavior.\
\
Read more about [component markup and slots](https://www.webcomponents.org/specs#the-shadow-dom-specification).

## Style file

Optionally, a styles file `.css` may be set up to give individual styling to the provided markup.

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

| Name		       | Description |
| ---------------- | ---------- |
| **connected**    | *Fires once a component instance has been connected to the DOM* |
| **disconnected** | *Fires once a component instance has been disconnected from the DOM* |
| **moved**        | *Fires once a component instance has been moved* |

### Methods

Methods are to be created by simply giving a name followed by an argument list and the function scoped body:

``` js
<method-name>(<arguments>) {
    // Custom script
}
```

> Any method is publicly accessible from component instances (reference).

### `this` context

The keyword `this` (accessibl from lifecycle event and method bodys) gives a reference to the related compoenent instance.

### Component DOM

In order to manipulate the component specific DOM constructed based on the component markup, use the `COMPONENT` identifier on a related instance.

#### Example

``` js
this.COMPONENT.querySelector("button").style.display = "block";
```

### Attribute change listeners

As the graphical interface of a component instance might depend on its attribute values, listening to attribute changes can be achieved using attribute change listeners by the following concept.

``` js
addChangeListener("<attrbute-name>", (oldValue, newValue) => {
    // Custom script
});
```

### Retrieve component class reference

Sometimes it might be helpful to obtain a reference to the component class (e.g. for accessing static members). The component interface provides the `component()` method to retrieve a certain reference.

#### Syntax

``` js
rapidJS["@t-ski/rapidjs--components"].component(name)
```

#### Parameter

| Name	   | Type     | Description |
| -------- | -------- | ----------- |
| **name** | `String` | *Component (tag) name* |

#### Return value

`Class` *Component class reference*

## Further reading

- Hiding component instances with noscript elements in order to visually intercept no-script-environments: https://gist.github.com/t-ski/a51394acb91dc04103e104597b17b3a8