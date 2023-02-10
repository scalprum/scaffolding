/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const { DynamicRemotePlugin } = require('@openshift/dynamic-plugin-sdk-webpack');
const {
  container: { ModuleFederationPlugin },
} = webpack;

const sharedModules = {
  react: {
    singleton: true,
    eager: true,
  },
  'react-dom': {
    singleton: true,
    eager: true,
  },
  '@scalprum/react-core': {
    singleton: true,
    eager: true,
  },
  '@openshift/dynamic-plugin-sdk': {
    singleton: true,
    eager: true,
  },
};

const TestAppFederation = new ModuleFederationPlugin({
  name: 'testApp',
  filename: 'testApp.js',
  library: {
    type: 'var',
    name: 'testApp',
  },
  exposes: {
    './ModuleOne': path.resolve(__dirname, './src/modules/moduleOne.tsx'),
    './ModuleTwo': path.resolve(__dirname, './src/modules/moduleTwo.tsx'),
    './ModuleThree': path.resolve(__dirname, './src/modules/moduleThree.tsx'),
    './ErrorModule': path.resolve(__dirname, './src/modules/errorModule.tsx'),
  },
  shared: [
    {
      react: {
        singleton: true,
        eager: true,
      },
      'react-dom': {
        singleton: true,
        eager: true,
      },
      '@scalprum/react-core': {
        singleton: true,
        eager: true,
      },
      '@openshift/dynamic-plugin-sdk': {
        singleton: true,
        eager: true,
      },
    },
  ],
});

const TestPreLoadFederation = new ModuleFederationPlugin({
  name: 'preLoad',
  filename: 'preLoad.js',
  library: {
    type: 'var',
    name: 'preLoad',
  },
  exposes: {
    './PreLoadedModule': path.resolve(__dirname, './src/modules/preLoad.tsx'),
    './NestedModule': path.resolve(__dirname, './src/modules/nestedModule.tsx'),
  },
  shared: [sharedModules],
});

const TestModuleFederation = new ModuleFederationPlugin({
  name: 'testModule',
  filename: 'testModule.js',
  library: {
    type: 'var',
    name: 'testModule',
  },
  exposes: {
    './ModuleThree': path.resolve(__dirname, './src/modules/moduleThree.tsx'),
    './ModuleFour': path.resolve(__dirname, './src/modules/moduleFour.tsx'),
  },
  shared: [sharedModules],
});

const TestSDKPLugin = new DynamicRemotePlugin({
  extensions: [],
  sharedModules,
  entryScriptFilename: 'sdk-plugin.[fullhash].js',
});

module.exports = {
  mode: 'development',
  entry: {
    scaffolding: './src/scaffolding.tsx',
  },
  output: {
    publicPath: '/',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, '../../node_modules/react-router-dom'),
    },
  },
  plugins: [new webpack.ProgressPlugin(), TestSDKPLugin, TestAppFederation, TestModuleFederation, TestPreLoadFederation],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: 'ts-loader',
        include: [path.resolve(__dirname, 'src')],
        exclude: [/node_modules/],
      },
    ],
  },
  optimization: {
    minimizer: [new TerserPlugin()],
    chunkIds: 'named',
  },
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    historyApiFallback: true,
    client: {
      overlay: false,
    },
  },
};
