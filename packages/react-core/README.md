# @scalprum/react-core

This library works with [Webpack's federated modules](https://webpack.js.org/concepts/module-federation/). Its core library for loading JS files is [@scalprum/core](https://www.npmjs.com/package/@scalprum/core) for injecting JS files (either over direct JS entrypoint or with manifest in mind) and further providing bindings to React. These bindings include loading of components and specific hooks for hot injecting modules into your application.

### `ScalprumComponent`
### `scalprumContext`
### `useScalprum`
### `useModule`

This React hook will allow you to include any partial of a module. Meaning if your module is exporting some constants as named exports you can pick them.

**!Important: the container has to be loaded in the DOM before using this hook. For this you can use `useLoadModule`, `ScalprumComponent` or directly injecting it on your own.!**

Example:
```JSX
import React, { Suspense } from 'react';

const MyCmp = () => {
  const { default: SomeConst, someExport } = useModule('appName', './SomeModule', {}, {});
  const calculatedValue = someExport();

  return <Suspense fallback="loading">
    <SomeConst value={calculatedValue} />
  </Suspense>
}

export default MyCmp;
```

Module `SomeModule` from `appName` scope is exporting 2 memebers `default` (a component) and `someExport` (a function to calculate something).

#### Arguments

This hook accepts 4 parameters:
* scope - container from which we'll pull the module from
* module - name of the module we'll import
* default state - used for fallbacks, you can for instance pass in default loader
* options - object to fine tune the hook
  * skipCache - flag to force reload of module even if it was loaded before

### `useLoadModule`

React hook to use module and load its container. This hook will allow you to load the container holding required module into DOM, if the container was loaded before it will use that one so you don't have to care about the process. If you don't know if the container was loaded and are unsure whether to use `useModule` or `useLoadModule` prefer the later, this way you won't have to deal with errors if the container was not loaded before using the module from it.

```JSX
import React, { Suspense } from 'react';

const MyCmp = () => {
  const [{ default: SomeConst, someExport }, error] = useLoadModule({
    //appName: 'appName', // optional
    scope: 'appName',
    module: './SomeModule',
    // processor: (val) => val, // optional
  }, {}, {});
  const calculatedValue = someExport();

  return <Suspense fallback="loading">
    <SomeConst value={calculatedValue} />
  </Suspense>
}

export default MyCmp;
```

Module `SomeModule` from `appName` scope is exporting 2 memebers `default` (a component) and `someExport` (a function to calculate something).

#### Arguments

This hook accepts 3 parameters:
* moduleDefinition - an object to describe which module from provider and the scope we want to import.
  * appName - app container's name to load the module from (can be omited, scope will be used as fallback)
  * scope - scope from the container to pull module from
  * module - name of the module we'll use to import the exports from
  * processor - function to further process the manifest (optional).\
  Default value: `(value) => value[1].entry || value`
* default state - used for fallbacks, you can for instance pass in default loader
* options - object to fine tune the hook
  * skipCache - flag to force reload of module even if it was loaded before
