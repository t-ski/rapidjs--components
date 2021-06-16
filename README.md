# rapid--components

## Purpose

Providing abstract web components functionality for creating individual, self-contained elements to be reused among markup documents.

## Installation

```
npm install "rapid--components"
```

## Usage

### Concept

The plug-in basically provides an abstraction wrapper around the [web components standard](https://www.webcomponents.org/introduction#specifications), thus inducing a simplified and enclosed usage enviornment of that standard. of Effectively, a valid web component represents an extension of the HTML element set. I.e. web components are to be used just likeordinary HTML elements, but utilizing a specific structure, style and logic.

### Specific component directory

Each component is to be organized in its own directory containing component related files. The component's element tag name corresponds to the respective directory name, prefixed by the component prefix **rapid--**. All component files in the directory will need to have the same name as the directory does.

#### Markup file

A file (.html) stating standard markup to compose the component's blackboxed interface needs to exist in the component directory in order to make it work.

#### Styles file

Optionally, a styles file (.css) may be set up to give individual styling to the markup provided in the markup file.\
\
When giving a .scss file to use SASS, a respective reader on the core interface must be set up to transpile SCSS to CSS code. In order to have the transpilation be done by a response modifier, enable response modifier application on component files as follows:

``` js
    "components": {
        "applyResponseModifier": false,
    }
```

> When appling response modifiers to components, all component files will be affected by respective response modifiers (e.g. HTML minification would be applied to the component markup file, too).

#### Script file

The also optional script file ...

### General components directory

All component specific directories are to be placed in a dedicated components directory. Define the path to that directory in the components feature specific configuration file scope: 

``` js
    "components": {
        "componentsDirPath": "./_components"
    }
```


