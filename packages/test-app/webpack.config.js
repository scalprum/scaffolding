/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const {
  container: { ModuleFederationPlugin },
} = webpack;

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
    },
  ],
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
    },
  ],
});

module.exports = {
  mode: 'development',
  entry: {
    scaffolding: './src/scaffolding.tsx',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, '../../node_modules/react-router-dom'),
    },
  },
  plugins: [
    new webpack.ProgressPlugin(),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './src/index.html'),
    }),
    TestAppFederation,
    TestModuleFederation,
  ],
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
  },
  devServer: {
    historyApiFallback: true,
  },
};
