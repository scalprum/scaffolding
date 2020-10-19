import { testImport } from './test-import';

export const initialize = (foo: string) => {
  /**
   * Just testing build
   */
  console.log('Scalprum init function', foo, testImport());
};
