/* eslint-disable @typescript-eslint/ban-ts-comment */
import { PluginManifest } from '@openshift/dynamic-plugin-sdk';
import { initialize, getScalprum, getCachedModule, initSharedScope } from '.';

describe('scalprum', () => {
  const testManifest: PluginManifest = {
    extensions: [],
    loadScripts: [],
    name: 'testScope',
    registrationMethod: 'custom',
    version: '1.0.0',
    baseURL: '/foo/bar',
  };
  const mockInitializeConfig = {
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
      appFour: {
        name: 'appFour',
        appId: 'app-four',
        elementId: 'app-four-element',
        rootLocation: '/foo/bar',
        pluginManifest: testManifest,
      },
      appFive: {
        name: 'appFive',
        appId: 'app-five',
        elementId: 'app-five-element',
        rootLocation: '/foo/bar',
        manifestLocation: '/appFive/url',
        pluginManifest: testManifest,
      },
    },
  };

  beforeAll(() => {
    // @ts-ignore
    global.__webpack_share_scopes__ = {
      default: {},
    };
    // @ts-ignore
    global.__webpack_init_sharing__ = () => undefined;
  });

  beforeEach(() => {
    initSharedScope();
  });

  test('should initialize scalprum with apps config', () => {
    initialize(mockInitializeConfig);

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
        appFour: {
          appId: 'app-four',
          elementId: 'app-four-element',
          name: 'appFour',
          rootLocation: '/foo/bar',
          pluginManifest: {
            baseURL: '/foo/bar',
            extensions: [],
            loadScripts: [],
            name: 'testScope',
            registrationMethod: 'custom',
            version: '1.0.0',
          },
        },
        appFive: {
          appId: 'app-five',
          elementId: 'app-five-element',
          name: 'appFive',
          rootLocation: '/foo/bar',
          manifestLocation: '/appFive/url',
          pluginManifest: {
            baseURL: '/foo/bar',
            extensions: [],
            loadScripts: [],
            name: 'testScope',
            registrationMethod: 'custom',
            version: '1.0.0',
          },
        },
      },
      exposedModules: {},
      pendingInjections: {},
      pendingLoading: {},
      pendingPrefetch: {},
      existingScopes: new Set(),
      api: {},
      scalprumOptions: {
        cacheTimeout: 120,
        enableScopeWarning: false,
      },
      pluginStore: expect.any(Object),
    };

    // @ts-ignore
    expect(getScalprum()).toEqual(expectedResult);
  });

  test('getScalprum should return the scalprum object', () => {
    initialize(mockInitializeConfig);
    const result = getScalprum();
    expect(result).toEqual(expect.any(Object));
  });

  test('async loader should cache the webpack container factory', async () => {
    const expectedPlugins = [
      {
        disableReason: undefined,
        enabled: true,
        manifest: { baseURL: '/foo/bar', extensions: [], loadScripts: [], registrationMethod: 'custom', name: 'testScope', version: '1.0.0' },
        status: 'loaded',
      },
    ];
    initialize(mockInitializeConfig);
    // @ts-ignore
    global.testScope = {
      init: jest.fn(),
      get: jest.fn().mockReturnValue(jest.fn().mockReturnValue(jest.fn())),
    };
    await getScalprum().pluginStore.loadPlugin(testManifest);
    expect(getScalprum().pluginStore.getPluginInfo()).toEqual(expectedPlugins);
  });

  test('getCachedModule should invalidate cache after 120s', async () => {
    jest.useFakeTimers();
    initialize(mockInitializeConfig);
    // @ts-ignore
    global.testScope = {
      init: jest.fn(),
      get: jest.fn().mockReturnValue(jest.fn().mockReturnValue(jest.fn())),
    };
    await getScalprum().pluginStore.loadPlugin(testManifest);
    // @ts-ignore
    expect(getCachedModule('testScope', './testModule')).toHaveProperty('cachedModule');
    /**
     * Advance time by 120s + 1ms
     */
    jest.advanceTimersByTime(120 * 1000 + 1);
    expect(getCachedModule('testScope', './testModule')).toEqual({});
  });

  test('getCachedModule should skip factory cache', async () => {
    jest.useFakeTimers();
    initialize(mockInitializeConfig);
    // @ts-ignore
    global.testScope = {
      init: jest.fn(),
      get: jest.fn().mockReturnValue(jest.fn()),
    };
    await getScalprum().pluginStore.loadPlugin(testManifest);
    // @ts-ignore
    expect(getCachedModule('testScope', './testModule', true)).toEqual({});
  });
});
