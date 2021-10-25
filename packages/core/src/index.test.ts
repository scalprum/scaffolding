/* eslint-disable @typescript-eslint/ban-ts-comment */
import { initialize, GLOBAL_NAMESPACE, getScalprum, asyncLoader, getFactory } from '.';

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

  test('async loader should cache the webpack container factory', async () => {
    const expectFactories = {
      testScope: {
        init: expect.any(Function),
        get: expect.any(Function),
        expiration: expect.any(Date),
      },
    };
    initialize(mockInititliazeConfig);
    // @ts-ignore
    global.__webpack_init_sharing__ = jest.fn();
    // @ts-ignore
    global.__webpack_share_scopes__ = {
      default: jest.fn(),
    };
    // @ts-ignore
    global.testScope = {
      init: jest.fn(),
      get: jest.fn().mockReturnValue(jest.fn()),
    };
    await asyncLoader('testScope', './testModule');
    // @ts-ignore
    expect(global[GLOBAL_NAMESPACE].factories).toEqual(expectFactories);
  });

  test.only('getFactory should invalidate cache after 120s', async () => {
    jest.useFakeTimers();
    initialize(mockInititliazeConfig);
    // @ts-ignore
    global.__webpack_init_sharing__ = jest.fn();
    // @ts-ignore
    global.__webpack_share_scopes__ = {
      default: jest.fn(),
    };
    // @ts-ignore
    global.testScope = {
      init: jest.fn(),
      get: jest.fn().mockReturnValue(jest.fn()),
    };
    await asyncLoader('testScope', './testModule');
    // @ts-ignore
    expect(getFactory('testScope')).toEqual(expect.any(Object));
    /**
     * Advance time by 120s + 1ms
     */
    jest.advanceTimersByTime(120 * 1000 + 1);
    expect(getFactory('testScope')).toEqual(undefined);
  });
});
