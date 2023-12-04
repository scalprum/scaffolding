# What is Scalprum? 

Scalprum is a tool for building dynamic frontend UIs from a variety of different sources. Thanks to Scalprum’s dynamic nature, you can pick and choose different components that you want to pull into your UI without having to worry about rebuilding your UI each time you pull in a change. Scalprum has been built with configurability in mind - you can manage different outputs all from one configuration file, without the need to fill your code with conditionals. 

Scalprum is a JavaScript micro frontend framework. It leverages [webpack](https://webpack.js.org/) 5 and its [module federation](https://webpack.js.org/concepts/module-federation/#root) features to create fast and scaleable micro frontend environments. 


# Getting started

### Prerequisites

- Ensure that you have [Node.js](https://nodejs.org/en/download/) installed. 
- Environment using webpack 5 to build the final output
- Using React frontend library

### Procedure 

#### Demo environment setup 

The following steps outline an example webpack development setup for demo purposes. 
You can adjust the steps to suit your own development requirements. 

1. Create a working directory for the project:
```sh
mkdir scalprum-demo && cd scalprum-demo
```
2. Use the following command to initialise a node.
```sh
npm init
```
3. Optional: Depending on your needs, you might want to create a Git repository:
```sh
git init
```
4. Create a webpack project to set up the development dependencies: 
```sh
npm i --save-dev webpack webpack-cli webpack-dev-server swc-loader
```
5. Install swc-loader so that the webpack can understand react:
```sh
npm i --save-dev swc-loader @swc/core
```
6. Generate a default webpack configuration, and enter 'y' to any options you want to include:
```sh
npx webpack init
```
7. Edit the `tsconfig.json` file to match the following configuration: 
```js

{
  "compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "noImplicitAny": true,
    "module": "ESNext",
    "target": "ESNext",
    "allowJs": true,
    "moduleResolution": "node",
    "jsx": "react",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
  },
  "include": ["src/**/*ts", "src/**/*ts"]
}

```
8. Install Scalprum and its dependencies: 
```sh
npm i react react-dom @scalprum/core @scalprum/react-core
```
9. Add a type definition for react: 
```sh
npm i --save-dev @types/react-dom @types/react
```
10. Edit the `index.html` file to add the root element also to the html: 
```htmlembedded=
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8"/>
            <title>Webpack App</title>
    </head>
<body>
<div id="root"></div>
</body>
</html>
```

11. Edit the `webpack.config.js` file to match the following configuration: 
```js
// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { ModuleFederationPlugin } = require('webpack').container;

const isProduction = process.env.NODE_ENV == "production";

const stylesHandler = MiniCssExtractPlugin.loader;

const config = {
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
  },
  devServer: {
    open: true,
    host: "localhost",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "index.html",
    }),
    new MiniCssExtractPlugin(),

  ],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/i,
        use: {
          loader: 'swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true
              }
            }
          }
        },
        exclude: ["/node_modules/"],
      },
      {
        test: /\.css$/i,
        use: [stylesHandler, "css-loader"],
      },
      {
        test: /\.s[ac]ss$/i,
        use: [stylesHandler, "css-loader", "sass-loader"],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
        type: "asset",
      },

      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", "..."],
  },
};

module.exports = () => {
  if (isProduction) {
    config.mode = "production";
  } else {
    config.mode = "development";
  }
  return config;
};
```
12. Change the `index.ts` file extention to `index.tsx` and edit the `index.tsx` file to match the following example:
```js

import React from 'react';
import { createRoot } from 'react-dom/client';

const App = () => {
  return (
    <div>I am an app</div>
  )
}

const domNode = document.getElementById('root');
if(domNode) {
  const root = createRoot(domNode);
  root.render(<App />)
}

```

If everything is set up, you can run `npm run serve` and view the example text that you entered in the `<div>` of `index.tsx`. 

### Scalprum setup 

To use Scalprum, we must create a **host application**.

A *host application* is the main provider that manages module loading, routing, data sharing, and related tasks. It functions as the manager of the micro-frontend. 
The host application always loads first. 
It can be any React application as long as it has some mandatory webpack configuration.

1. To create a host application - a top-level application to manage the micro frontend, in the `scalprum-demo/src` directory, create a `ScalprumRoot.tsx` file, and edit to match the following configuration: 
```jsx

import React from 'react';
import { AppsConfig } from '@scalprum/core'
import { ScalprumProvider, ScalprumComponent } from '@scalprum/react-core'

const config: AppsConfig = {
  remoteModule: {
    name: 'remoteModule',
    manifestLocation: 'http://localhost:8003/plugin-manifest.json'
  }
}

const ScalprumRoot = () => {
  return (
    <div>
      <ScalprumProvider config={config}>
        <ScalprumComponent scope="remoteModule" module="RemoteModuleComponent" />
      </ScalprumProvider>
    </div>
  )
}

export default ScalprumRoot;
```

Let's take a look at what we set up in this example. 



| Component | Definition | 
| -------- | -------- | 
| **`AppsConfig module`**     | The **`AppsConfig`** is a set of dynamic modules from '@scalprum/core'. This is framework-agnostic and will work as long as it is in Javascript.      | 
|**`@scalprum/core`** package| The **`@scalprum/core`** package is responsible for managing  federated modules. It provides an abstraction on low-level API to make it more developer friendly alongside additional features. Behind the scenes, it uses our exposed webpack modules, **`@openshift/dynamic-plugin-sdk`**, to manage plugins.|
|**`ScalprumProvider`** module|The **`ScalprumProvider`** is the main root component. If you want to load modules, you must ensure they are enclosed in the `<ScalprumProvider />` components. `ScalprumProvider` has a mandatory `config` field. This informs `ScalprumProvider` of which remote modules are available to render. For the purpose of the demo, `const config: AppsConfig = {}`, we set up `remoteModule` to use in the next steps. The config requires a `name`, and a `manifestLocation`.|
|**`@scalprum/react-core`**|The **`@scalprum/react-core`** packages provide react core bindings for `@scalprum/core`.|
|**`ScalprumComponent`**|The **`ScalprumComponent`** is provided by the **`@scalprum/react-core`** packages. It requires two parameters: **`scope`**: the `name` that you set in the `ScalprumProvider`'s `config{}`. **`module`**: the actual module that you want to render. For the purposes of this demo, create `RemoteModuleComponent`.
|


2. Edit the `index.tsx` file and make the following changes: 

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import ScalprumRoot from './ScalprumRoot';

const App = () => {
  return (
    <ScalprumRoot/>
  )
}

const domNode = document.getElementById('root');
if(domNode) {
  const root = createRoot(domNode);
  root.render(<App />)
}
```

3. In the `webpack.config.js` file, add the `moduleFederation` plugin to set up the environment for plugin applications to use the context of the host applications: 

```jsx
// declare shared dependencies
const moduleFederationPlugin = new ModuleFederationPlugin({
  name: 'host',
  filename: 'host.[fullhash].js',
  shared: [
    {'@openshift/dynamic-plugin-sdk': { singleton: true, requiredVersion: '*'} },
    { '@scalprum/react-core': { singleton: true, requiredVersion: '*'} },
    { react: { singleton: true, requiredVersion: '*' } },
    { 'react-dom': { singleton: true, requiredVersion: '*' } },
    // any other packages you wish to share
  ]
})
```

Note that for demo purposes, the `requiredVersion` for dependencies in this example is set to `*`, but you can update this to a version that suits your requirements.

4. In the `webpack.config.js` file, add an entry also for the `moduleFederationPlugin` to the declared plugins: 

```jsx
   plugins: [
    new HtmlWebpackPlugin({
      template: "index.html",
    }),
    new MiniCssExtractPlugin(),
    // scalprum required plugin
    moduleFederationPlugin,
  ],
```
5. To create the remote module, in the `scalprum-demo` directory, create a **remoteModule** directory. 
6. Install the following dependencies: 
```shell
npm i --save-dev @openshift/dynamic-plugin-sdk-webpack
```
7. In the **scalprum-demo/remoteModule** directory, create a `webpack.config.js` file. 
8. You can copy the contents of `webpack.config.js` file from the previous steps.
9. In the `webpack.config.js` file, remove the `HtmlWebpackPlugin` because it breaks dynamic modules.
This is a known issue that is being actively worked on.
10. Remove the `moduleFederationPlugin` and replace with the `DynamicRemotePlugin`: 
```jsx
// declare shared dependencies

const { DynamicRemotePlugin } = require('@openshift/dynamic-plugin-sdk-webpack');

const sharedModules = {
    '@openshift/dynamic-plugin-sdk':( singleton: true},
    '@scalprum/react-core':( singleton: true},
    react: { singleton: true),
    'react-dom': ( singleton: true },

const dynamicPlugin = new DynamicRemotePlugin({
    extensions: [],
    sharedModules,
    entryScriptfilename:'remoteModule.(fullhash].js',
    pluginMetadata: {    
      name: "remoteModule",
      version: "1.0.0",
      exposedModules: {
        RemoteModuleComponent": "./remoteModule/src/RemoteModuleComponent.tsx"
      },
      extensions: []
    }
});

```
11. In the `webpack.config.js` file, also replace the `moduleFederationPlugin` with the `dynamicPlugin` plugins: 

```jsx
   plugins: [

    new MiniCssExtractPlugin(),
    // scalprum required plugin
    dynamicPlugin
    ,
  ],
```
12.  In the `webpack.config.js` file, also add a `publicPath`: 
```jsx
const config = {
    entry: "./src/index.tsx",
    output: {
    path: path.resolve(_dirname, "dist"),
    publicPath:'http://localhost:8003'
    },
devServer: {
    open: true,
    host: "localhost",
},

```

13. In your **scalprum-demo/remoteModule** directory, create a **src** directory. 
14. In your **scalprum-demo/remoteModule/src** directory, create an `index.tsx` file. 
15. In your **scalprum-demo/remoteModule/src** directory, create a `RemoteModuleComponent.tsx` file and add the following: 
```jsx
import React from 'react';

const RemoteModuleComponent = () => {
  return (
    <div>
    I am a remote module component;
    </div>
  )
}

export default RemoteModuleComponent; 

```

16. In the `scalprum-demo/package.json` file, add the following entry and point to `remoteModule/webpack.config.js` as your configuration file: 

```json 

"build:plugin":"webpack --mode=production --node-env=production -c remoteModule/webpack.config.js"

```


To test if everything is set up correctly, enter the following command: 

```shell 
npm run build:plugin
```

Normally, your modules would be served via your own content delivery network, but for demo purposes, you can serve it locally from the **dist** directory that is created when you run `npm run build:plugin`.

```shell
cd scalprum-demo/remoteModule/dist/ && npx http serve . -p 8003
```

If this action completes without error, you can view your plugin manifest at `http://localhost:8003/`. 
You can also run the host application via `npm run serve` and check if the dynamic plugin was loaded correctly in the UI.

### Reference information


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

***importName***

The `importName` prop is a string that is used to reference the module. It is a name of the exported component from the module. Should be used if other than `default` export is required.

```jsx
// Remote module definition
export const NamedComponent = () => {
  return (
    <div>
      <h2>Named component</h2>
    </div>
  )
}

// Consumer
<ScalprumComponent {...props} importName="NamedComponent">
```
One module can have multiple exports.

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

