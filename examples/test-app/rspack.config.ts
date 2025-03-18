/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-ts-comment */

const path = require('path');
const rspack = require('@rspack/core');

/* eslint-disable @typescript-eslint/no-explicit-any */
const { withNx } = require('@nx/rspack');
// const { composePluginsSync } = require('@nx/webpack');
const { withReact } = require('@nx/react');
const { merge } = require('webpack-merge');
// import { Configuration } from 'webpack';
// import { join } from 'path';
// import { ModuleFederationPlugin } from '@module-federation/enhanced';
const { container } = require('@rspack/core');
// import path from 'path';

const { ModuleFederationPlugin } = container;

const ShellConfig = new ModuleFederationPlugin({
  name: 'chrome',
  filename: 'chrome.[contenthash].js',
  library: {
    type: 'global',
    name: 'chrome',
  },
  shared: [
    {
      react: {
        singleton: true,
        requiredVersion: '*',
      },
      'react-dom': {
        singleton: true,
        requiredVersion: '*',
      },
      '@scalprum/core': {
        singleton: true,
        requiredVersion: '*',
        version: '0.8.1',
      },
      '@scalprum/react-core': {
        singleton: true,
        requiredVersion: '*',
        version: '0.9.3',
      },
      '@openshift/dynamic-plugin-sdk': {
        singleton: true,
        requiredVersion: '*',
      },
    },
  ],
});

function init(_, { options, context }) {
  /** @type {import('@rspack/core').Configuration} */
  const baseConfig = {
    mode: 'development',
    cache: false,
    target: 'web',
    output: {
      publicPath: 'auto',
    },
    context: path.resolve(__dirname),
    entry: path.resolve(__dirname, './src/main.ts'),
    experiments: {
      css: true,
    },
    plugins: [
      new rspack.HtmlRspackPlugin({
        template: path.resolve(__dirname, './src/index.html'),
      }),
      ShellConfig,
    ],
    resolve: {
      extensions: ['.tsx', '.ts', '...'],
      modules: [path.resolve(__dirname, '../../node_modules'), 'node_modules', 'src', '...'],
      alias: {
        react: path.resolve(__dirname, '../../node_modules/react'),
        'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
        '@scalprum/core': path.resolve(__dirname, '../../dist/packages/core'),
        '@scalprum/react-core': path.resolve(__dirname, '../../dist/packages/react-core'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              target: 'es2015',
              jsc: {
                transform: {
                  react: {
                    runtime: 'automatic',
                  },
                },
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
    devServer: {
      historyApiFallback: true,
      client: {
        overlay: false,
      },
    },
  };
  const config = merge(baseConfig, withNx(), withReact());
  console.log({ config });
  config.plugins?.forEach((plugin) => {
    if (plugin?.constructor.name === 'ReactRefreshPlugin') {
      // disable annoying overlay
      // @ts-ignore
      plugin.options.overlay = false;
    }
  });
  return config;
}

// Nx plugins for webpack to build config object from Nx options and context.
module.exports = init;

// const config: Configuration = {
//   entry: path.resolve(__dirname, './src/main.ts'),
//   plugins: [ShellConfig],
//   resolve: {
//     extensions: ['.tsx', '.ts', '.js', '...'],
//     modules: [path.resolve(__dirname, '../../node_modules'), 'node_modules', 'src', '...'],
//   },
//   module: {
//     rules: [
//       {
//         test: /\.tsx?$/,
//         exclude: /node_modules/,
//         use: {
//           loader: 'builtin:swc-loader',
//           options: {
//             jsc: {
//               parser: {
//                 syntax: 'typescript',
//                 tsx: true,
//               },
//             },
//           },
//         },
//       },
//     ],
//   },
//   devServer: {
//     port: 4200,
//   },
// };

// export default config;
