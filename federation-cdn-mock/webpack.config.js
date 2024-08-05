const { resolve } = require('path');
const { ModuleFederationPlugin, ContainerPlugin } = require('@module-federation/enhanced');
const { DynamicRemotePlugin } = require('@openshift/dynamic-plugin-sdk-webpack');

console.log('Entry tests:', resolve(__dirname, './src/modules/moduleOne.tsx'));

const sharedModules = {
  react: {
    singleton: true,
    requiredVersion: '*',
    version: '18.2.0',
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '*',
    version: '18.2.0',
  },
  '@scalprum/react-core': {
    singleton: true,
    requiredVersion: '*',
  },
  '@openshift/dynamic-plugin-sdk': {
    singleton: true,
    requiredVersion: '*',
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
    cache: { type: 'filesystem', cacheDirectory: resolve(__dirname, '.cdn-cache') },
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
            loader: 'swc-loader',
            options: {
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
