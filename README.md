# Scaffolding

## Introduction

Scalprum is a JavaScript micro frontend framework. It leverages [webpack](https://webpack.js.org/) 5 and its [module federation](https://webpack.js.org/concepts/module-federation/#root) features to create fast and scaleable micro frontend environments. 

# Docs

## @scalprum/core

The `@scalprum/core` package is responsible for the managing the federated modules. Behind the scenes, it uses our `@openshift/dynamic-plugin-sdk` to manage plugins (exposed webpack modules).

The core package provides an abstraction on low-level API to make it more developer friendly alongside additional features.

## @scalprum/react-core

The `@scalprum/react-core` provides React bindings for the core package. We recommend using the react-core package and its modules to build UI based on the React library.

## Getting started

### Prerequisites

- Environment using webpack 5 to build the final output
- Using React frontend library

### Host application

A host (or shell) application is the main provider that will manage the module loading, routing, data sharing, etc. This application will be always loaded first. It can be any React application as long as it has some mandatory webpack configuration.

***dependencies***
```sh
npm i @openshift/dynamic-plugin-sdk @scalprum/core @scalprum/react-core
```

#### Webpack config

TODO: Create host webpack plugin or extensible default webpack config

```js
// webpack.config.js

// require module federation plugin
const { ModuleFederationPlugin } = require('webpack').container;

// declare shared dependencies
const moduleFederationPlugin = new ModuleFederationPlugin({
  name: 'host',
  filename: 'host.[fullhash].js',
  shared: [{
    // These packages has to be shared and has to be marked as singleton!
    { '@openshift/dynamic-plugin-sdk', { singleton: true, eager: true}}
    { '@scalprum/react-core': { singleton: true, eager: true} },
    { react: { singleton: true, eager: true } },
    { 'react-dom': { singleton: true, eager: true } },
    // any other packages you wish to share
  }]
})

module.exports = {
  // regular react webpack config
  plugins: [moduleFederationPlugin, ... /** other plugins you need */]
}
```

The host application requires an extra module federation plugin to be compatible with scalprum packages.

The following modules have to be shared and marked as singletons:
- `@scalprum/react-core`
- `react`
- `react-dom`

If your application requires additional shared/singleton packages (eg. `react-router-dom`) they can be added to the plugin configuration.

#### ScalprumProvider

The `ScalprumProvider` is a root React node that propagates necessary context to its children. It requires a configuration object that is referenced when a module is loaded.

```JSX
import App from './App'

const config = {
  testModuleOne: {
    name: 'testModuleOne', // module name
    manifestLocation: '/path/to/manifest/file.json' // metadata file with module entry script location and other information
  },
  testModuleTwo: {
    name: 'testModuleTwo',
    manifestLocation: ...
  }
}

const HostRoot = () => {
  return (
    <ScalprumProvider
      api={{
        /** Custom object */
      }}
      config={config}
    >
      <App />
    </ScalprumProvider>
  )
}

export default HostRoot
```

***config***

The config prop contains is a module registry. The config data is used to load and initialize modules at runtime.

```TS
type Config = {
  [name: string]: {
    name: string;
    manifestLocation: string;
  }
}
```
***manifestLocation***

The `manifestLocation` attribute is a path to a JSON file including critical module information. This information is generated at plugin build (learn more below)

***api***

The `api` prop is an object that is available to all provider children nodes via `useScalprum` hook. It is a good place to store your global context (user, auth API, etc...).

```JSX
const HostRoot = () => {
  return (
    <ScalprumProvider
      api={{
        user: {
          name: 'John Doe',
          email: 'johndoe@email.com'
        }
      }}
      config={config}
    >
      <App />
    </ScalprumProvider>
  )
}

import { useScalprum } from '@scalprum/react-core'

const Plugin = () => {
  const { api: { user } } = useScalprum()
  return (
    <div>
      <h2>Hello {user.name}</h2>
    </div>
  )
}
```

#### ScalprumComponent

The `ScalprumComponent` is a react binding that directly renders a module. The referenced module has to be a React component. The module also has to be present in the `ScalprumProvider` config.

```JSX
import { ScalprumComponent } from '@scalprum/react-core';

const RemotelyLoadedComponent = () => {

  const anyProps = {
    foo: 'bar'
  }

  return (
    <ScalprumComponent
      scope="testModuleOne"
      module=" "
      // any non scalprum props will be passed to the actual component
      {...anyProps} 
    />
  );
}

```

***fallback***

Similar to [React.Suspense](https://beta.reactjs.org/reference/react/Suspense). This component will be loaded before the module is ready.

```jsx
<ScalprumComponent {...props} fallback={<Spinner />}>
```

***ErrorComponent***

A node that is rendered if a module encountered a runtime error or failed to load.


```jsx
// error type cannot be strict and depends on type of error and on application
const ErrorComponent = ({ error, errorInfo }) => {
  useEffect(() => {
    // handle the error (report to logging service)
  }, [])
  return (
    <div>
      <h2>Error rendering component</h2>
    </div>
  )
}

<ScalprumComponent {...props} ErrorComponent={<ErrorComponent />}>
```

### Plugin application/module

To make a module compatible and loadable via `@scalprum/core` webpack will require a specific plugin.

***dependencies***

```sh
npm i --save-dev @openshift/dynamic-plugin-sdk-webpack
npm i @scalprum/react-core # is imports are used
```

```js
// plugin constructor
const { DynamicRemotePlugin } = require('@openshift/dynamic-plugin-sdk-webpack');

const sharedModules = {
  { '@openshift/dynamic-plugin-sdk', { singleton: true, eager: true}}
  { '@scalprum/react-core': { singleton: true, eager: true} },
  { react: { singleton: true, eager: true } },
  { 'react-dom': { singleton: true, eager: true } },
}

const dynamicPlugin = new DynamicRemotePlugin({
  extensions: [],
  sharedModules,
  entryScriptFilename: 'sdk-plugin.[fullhash].js',
});

module.exports = {
  // regular webpack config
  plugins: [dynamicPlugin, ...]
}

```

In addition to the webpack plugin, a `plugin-metadata.json` file has to be defined at the root of the folder

```sh
.
├── node_modules
├── package.json
├── plugin-metadata.json # metadata file
├── public
├── src
└── webpack.config.js

```

The file requires the following attributes
```js
{
  "name": "sdk-plugin", // plugin name a.k.a scope prop
  "version": "1.0.0", // plugin version
  "exposedModules": {
    // a.k.a module prop
    "ModuleOneExposedComponent": "./path/to/ModuleOneExposedComponent.js" 
  },
  "extensions": [] // list extensions if required
}
```

TODO: Link SDK extensions docs 