/* eslint-disable @typescript-eslint/ban-ts-comment */
import { initialize, GLOBAL_NAMESPACE, getScalprum } from '.';

describe('scalprum', () => {
  const mockInititliazeConfig = {
    appsConfig: {
      appOne: {
        name: 'appOne',
        appId: 'app-one',
        elementId: 'app-one-element',
        rootLocation: '/foo/bar',
        scriptLocation: '/appOne/url',
      },
      appTwo: {
        name: 'appTwo',
        appId: 'app-two',
        elementId: 'app-two-element',
        rootLocation: '/foo/bar',
        scriptLocation: '/appTwo/url',
      },
      appThree: {
        name: 'appThree',
        appId: 'app-three',
        elementId: 'app-three-element',
        rootLocation: '/foo/bar',
        manifestLocation: '/appThree/url',
      },
    },
  };

  afterEach(() => {
    // @ts-ignore
    global[GLOBAL_NAMESPACE] = undefined;
  });

  test('should initialize scalprum with apps config', () => {
    initialize(mockInititliazeConfig);

    const expectedResult = {
      appsConfig: {
        appOne: { appId: 'app-one', elementId: 'app-one-element', name: 'appOne', rootLocation: '/foo/bar', scriptLocation: '/appOne/url' },
        appTwo: { appId: 'app-two', elementId: 'app-two-element', name: 'appTwo', rootLocation: '/foo/bar', scriptLocation: '/appTwo/url' },
        appThree: {
          appId: 'app-three',
          elementId: 'app-three-element',
          name: 'appThree',
          rootLocation: '/foo/bar',
          manifestLocation: '/appThree/url',
        },
      },
      factories: {},
      pendingInjections: {},
    };

    // @ts-ignore
    expect(global[GLOBAL_NAMESPACE]).toEqual(expectedResult);
  });

  test('getScalprum should return the scalprum object', () => {
    initialize(mockInititliazeConfig);
    const restult = getScalprum();
    expect(restult).toEqual(expect.any(Object));
  });
});
