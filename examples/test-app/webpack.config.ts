/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { withNx, NxWebpackExecutionContext, composePluginsSync } from '@nx/webpack';
import { withReact } from '@nx/react';
import { merge } from 'webpack-merge';
import { Configuration } from 'webpack';
import { join } from 'path';
import { ModuleFederationPlugin } from '@module-federation/enhanced';

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

const withModuleFederation = (config: Configuration, { context }: NxWebpackExecutionContext): Configuration => {
  const plugins: Configuration['plugins'] = [ShellConfig];
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
