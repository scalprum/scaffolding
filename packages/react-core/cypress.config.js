const path = require('path');
const { ModuleFederationPlugin } = require('@module-federation/enhanced');

const ShellConfig = new ModuleFederationPlugin({
  name: 'shell',
  filename: 'shell.[contenthash].js',
  library: {
    type: 'global',
    name: 'shell',
  },
  shared: [
    {
      react: {
        singleton: true,
      },
      'react-dom': {
        singleton: true,
      },
      '@scalprum/react-core': {
        singleton: true,
      },
      '@openshift/dynamic-plugin-sdk': {
        singleton: true,
      },
    },
  ],
});

const config = {
  component: {
    videosFolder: '../../dist/cypress/packages/react-core/videos',
    screenshotsFolder: '../../dist/cypress/packages/react-core/screenshots',
    chromeWebSecurity: false,
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    devServer: {
      framework: 'react',
      bundler: 'webpack',
      webpackConfig: () => {
        return {
          resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            alias: {
              '@scalprum/core': path.resolve(__dirname, '../core/src/index.ts'),
            },
          },
          module: {
            rules: [
              {
                test: /\.(js|ts)x?$/,
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
              {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
              },
            ],
          },
          plugins: [ShellConfig],
        };
      },
    },
  },
};

module.exports = config;
