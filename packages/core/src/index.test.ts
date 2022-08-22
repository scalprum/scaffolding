/* eslint-disable @typescript-eslint/ban-ts-comment */
import { initialize, GLOBAL_NAMESPACE, getScalprum, asyncLoader, getCachedModule } from '.';

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
      pendingLoading: {},
      scalprumOptions: {
        cacheTimeout: 120,
      },
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
        modules: {
          './testModule': expect.any(Function),
        },
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
      get: jest.fn().mockReturnValue(jest.fn().mockReturnValue(jest.fn())),
    };
    await asyncLoader('testScope', './testModule');
    // @ts-ignore
    expect(global[GLOBAL_NAMESPACE].factories).toEqual(expectFactories);
  });

  test('getCachedModule should invalidate cache after 120s', async () => {
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
      get: jest.fn().mockReturnValue(jest.fn().mockReturnValue(jest.fn())),
    };
    await asyncLoader('testScope', './testModule');
    // @ts-ignore
    expect(getCachedModule('testScope', './testModule')).toEqual(expect.any(Function));
    /**
     * Advance time by 120s + 1ms
     */
    jest.advanceTimersByTime(120 * 1000 + 1);
    expect(getCachedModule('testScope', './testModule')).toEqual(undefined);
  });

  test('getCachedModule should skip factory cache', async () => {
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
    expect(getCachedModule('testScope', './testModule', true)).toEqual(undefined);
  });

  test('getCachedModule should invalidate cache after 300s', async () => {
    jest.useFakeTimers();
    initialize({
      ...mockInititliazeConfig,
      options: {
        cacheTimeout: 300,
      },
    });
    // @ts-ignore
    global.__webpack_init_sharing__ = jest.fn();
    // @ts-ignore
    global.__webpack_share_scopes__ = {
      default: jest.fn(),
    };
    // @ts-ignore
    global.testScope = {
      init: jest.fn(),
      get: jest.fn().mockReturnValue(jest.fn().mockReturnValue(jest.fn())),
    };
    await asyncLoader('testScope', './testModule');
    // @ts-ignore
    expect(getCachedModule('testScope', './testModule')).toEqual(expect.any(Function));
    /**
     * Advance time by 120s + 1ms
     */
    jest.advanceTimersByTime(120 * 1000 + 1);
    expect(getCachedModule('testScope', './testModule')).toEqual(expect.any(Function));
    /**
     * Advance time by 180s + 1ms
     */
    jest.advanceTimersByTime(180 * 1000 + 1);
    expect(getCachedModule('testScope', './testModule')).toEqual(undefined);
  });
});
