import { testImport } from './test-import';

describe('testImport', () => {
  test('should return "x"', () => {
    const result = testImport();
    expect(result).toEqual('x');
  });
});
