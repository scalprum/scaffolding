import { applyCodeRefSymbol, isCodeRef, type CodeRef } from '@openshift/dynamic-plugin-sdk';

describe('@openshift/dynamic-plugin-sdk CodeRef identity', () => {
  it('recognizes refs marked by the same SDK module instance', () => {
    const codeRef: CodeRef = async () => undefined;

    applyCodeRefSymbol(codeRef);

    expect(isCodeRef(codeRef)).toBe(true);
  });

  it('does not recognize refs marked by a separately loaded SDK module', () => {
    const hostCodeRef: CodeRef = async () => undefined;
    applyCodeRefSymbol(hostCodeRef);

    let isolatedSdk: typeof import('@openshift/dynamic-plugin-sdk') | undefined;
    jest.isolateModules(() => {
      isolatedSdk = jest.requireActual<typeof import('@openshift/dynamic-plugin-sdk')>('@openshift/dynamic-plugin-sdk');
    });

    expect(isolatedSdk).toBeDefined();
    expect(isCodeRef(hostCodeRef)).toBe(true);
    expect(isolatedSdk?.isCodeRef(hostCodeRef)).toBe(false);

    const separatelyMarkedCodeRef: CodeRef = async () => undefined;
    isolatedSdk?.applyCodeRefSymbol(separatelyMarkedCodeRef);
    expect(isolatedSdk?.isCodeRef(separatelyMarkedCodeRef)).toBe(true);
    expect(isCodeRef(separatelyMarkedCodeRef)).toBe(false);
  });
});
