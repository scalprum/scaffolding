/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @nx/enforce-module-boundaries */
import { withNx, NxWebpackExecutionContext, composePluginsSync } from '@nx/webpack';
import { withReact } from '@nx/react';
import { merge } from 'webpack-merge';
import { Configuration } from 'webpack';
import { join } from 'path';
import { existsSync } from 'fs';
import { ModuleFederationPlugin } from '@module-federation/enhanced';
import type { ScalprumRemoteTypesPlugin as RemoteTypesPlugin } from '@scalprum/remote-types/webpack';

const { ScalprumRemoteTypesPlugin }: { ScalprumRemoteTypesPlugin: typeof RemoteTypesPlugin } = require('../../dist/packages/remote-types/webpack.js');

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

const withModuleFederation = (config: Configuration, { context }: NxWebpackExecutionContext): Configuration => {
  const defaultModulesConfigLocation = join(context.root, 'federation-cdn-mock/dist/fed-modules-generated.json');
  const modulesConfigLocation = process.env.SCALPRUM_MODULES_CONFIG_LOCATION ?? defaultModulesConfigLocation;
  const plugins: Configuration['plugins'] = [ShellConfig];
  if (process.env.SCALPRUM_MODULES_CONFIG_LOCATION || existsSync(defaultModulesConfigLocation)) {
    plugins.push(
      new ScalprumRemoteTypesPlugin({
        modulesConfigLocations: [
          { scope: 'sdk-plugin', location: modulesConfigLocation },
          { scope: 'full-manifest', location: modulesConfigLocation },
        ],
        outputDirectory: join(context.root, 'examples/test-app/.scalprum/remote-types'),
      }),
    );
  }
  const newConfig = merge(config, {
    experiments: {
      outputModule: true,
    },
    output: {
      publicPath: 'auto',
    },
    plugins,
  });
  // @ts-ignore
  if (newConfig.devServer) {
    // @ts-ignore
    newConfig.devServer.client = {
      overlay: false,
    };
  }
  return newConfig;
};

const withWebpackCache = (config: Configuration, { context }: NxWebpackExecutionContext): Configuration => {
  return merge(config, {
    cache: {
      type: 'filesystem',
      cacheDirectory: join(context.root, '.webpack-cache'),
    },
    resolve: {
      alias: {
        '@scalprum/core': join(context.root, 'dist/packages/core'),
        '@scalprum/react-core': join(context.root, 'dist/packages/react-core'),
      },
    },
    watchOptions: {
      ignored: [join(context.root, 'examples/test-app/.scalprum/remote-types')],
    },
  });
};

function init(...args: any[]) {
  // @ts-ignore
  const config = composePluginsSync(withNx(), withReact(), withWebpackCache, withModuleFederation)(...args);
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
export default init;
