const { resolve } = require('path');
const { ModuleFederationPlugin, ContainerPlugin } = require('@rspack/core').container
const { DynamicRemotePlugin } = require('@openshift/dynamic-plugin-sdk-webpack');

console.log('Entry tests:', resolve(__dirname, './src/modules/moduleOne.tsx'));

const sharedModules = {
  react: {
    singleton: true,
    requiredVersion: '*',
    version: '^18.0.0',
    import: false
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '*',
    version: '^18.0.0',
    import: false
  },
  '@scalprum/core': {
    singleton: true,
    requiredVersion: '*',
    // version: "0.8.1",
    import: false
  },
  '@scalprum/react-core': {
    singleton: true,
    requiredVersion: '*',
    // version: "0.9.3",
    import: false
  },
  '@openshift/dynamic-plugin-sdk': {
    singleton: true,
    requiredVersion: '*',
    import: false
  },
};

const TestSDKPlugin = new DynamicRemotePlugin({
  extensions: [],
  sharedModules,
  entryScriptFilename: 'sdk-plugin.[contenthash].js',
  moduleFederationSettings: {
    // Use non native webpack plugins
    pluginOverride: {
      ModuleFederationPlugin,
      ContainerPlugin,
    },
    libraryType: 'global',
  },
  pluginMetadata: {
    name: 'sdk-plugin',
    version: '1.0.0',
    exposedModules: {
      './ModuleOne': resolve(__dirname, './src/modules/moduleOne.tsx'),
      './ModuleTwo': resolve(__dirname, './src/modules/moduleTwo.tsx'),
      './ModuleThree': resolve(__dirname, './src/modules/moduleThree.tsx'),
      './ErrorModule': resolve(__dirname, './src/modules/errorModule.tsx'),
      './PreLoadedModule': resolve(__dirname, './src/modules/preLoad.tsx'),
      './NestedModule': resolve(__dirname, './src/modules/nestedModule.tsx'),
      './ModuleThree': resolve(__dirname, './src/modules/moduleThree.tsx'),
      './ModuleFour': resolve(__dirname, './src/modules/moduleFour.tsx'),
      './SDKComponent': resolve(__dirname, './src/modules/SDKComponent.tsx'),
      './ApiModule': resolve(__dirname, './src/modules/apiModule.tsx'),
    },
  },
});

const FullManifest = new DynamicRemotePlugin({
  extensions: [],
  sharedModules,
  pluginManifestFilename: 'full-manifest.json',
  entryScriptFilename: 'full-manifest.js',
  moduleFederationSettings: {
    // Use non native webpack plugins
    pluginOverride: {
      ModuleFederationPlugin,
      ContainerPlugin,
    },
    libraryType: 'global',
  },
  pluginMetadata: {
    name: 'full-manifest',
    version: '1.0.0',
    exposedModules: {
      './SDKComponent': resolve(__dirname, './src/modules/SDKComponent.tsx'),
    },
  },
});

function init() {
  /** @type { import("webpack").Configuration } */
  const config = {
    entry: {
      mock: resolve(__dirname, './src/index.tsx'),
    },
    // cache: { type: 'filesystem', cacheDirectory: resolve(__dirname, '.cdn-cache') },
    output: {
      publicPath: 'auto',
    },
    mode: 'development',
    plugins: [TestSDKPlugin, FullManifest],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
              },
            },
          },
        },
      ],
    },
  };

  return config;
}

// Nx plugins for webpack to build config object from Nx options and context.
module.exports = init;
