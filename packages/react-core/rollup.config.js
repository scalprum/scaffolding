import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import { createFilter } from 'rollup-pluginutils';
import typescript from '@rollup/plugin-typescript';

const external = createFilter(['react', 'react-dom', '@scalprum/core', 'react-router-dom'], null, { resolve: false });

const globals = {
  react: 'React',
  'react-dom': 'ReactDOM',
  '@scalprum/core': '@scalprum/core',
  'react-router-dom': 'react-router-dom',
};

const plugins = [
  replace({ 'process.env.NODE_ENV': JSON.stringify('production') }),
  terser({
    keep_classnames: true,
    keep_fnames: true,
  }),
  typescript({
    jsx: 'react',
    declarationDir: `dist/${process.env.FORMAT}`,
  }),
];

export default {
  input: './src/index.ts',
  output: { dir: `./dist/${process.env.FORMAT}`, name: '@scalprum/react-core', exports: 'named', globals, sourcemap: true },
  external: external,
  plugins,
};
