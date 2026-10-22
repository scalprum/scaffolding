/* eslint-disable @typescript-eslint/ban-ts-comment */
import { PluginLoaderInterface, PluginManifest } from '@openshift/dynamic-plugin-sdk';
import { initialize, getScalprum, getCachedModule, getModule, initSharedScope, removeScalprum } from './scalprum';

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

  describe('getModule', () => {
    const moduleExport = { default: 'default-export', named: 'named-export' };

    afterEach(() => {
      removeScalprum();
    });

    test('should load module using pluginManifest when manifestLocation is absent', async () => {
      const embeddedManifest: PluginManifest = {
        extensions: [],
        loadScripts: [],
        name: 'appFour',
        registrationMethod: 'custom',
        version: '1.0.0',
        baseURL: '/foo/bar',
      };
      initialize({
        appsConfig: {
          appFour: {
            name: 'appFour',
            pluginManifest: embeddedManifest,
          },
        },
      });
      // @ts-ignore
      global.appFour = {
        init: jest.fn(),
        get: jest.fn().mockReturnValue(jest.fn().mockReturnValue(moduleExport)),
      };
      const result = await getModule('appFour', './module');
      expect(result).toBe('default-export');
    });

    test('should prefer manifestLocation over pluginManifest when both are configured', async () => {
      const embeddedManifest: PluginManifest = {
        extensions: [],
        loadScripts: [],
        name: 'appFive',
        registrationMethod: 'custom',
        version: '1.0.0',
        baseURL: '/embedded',
      };
      // Return SDK-format manifest from URL so loadPlugin doesn't try to inject scripts
      const urlManifest: PluginManifest = {
        extensions: [],
        loadScripts: [],
        name: 'appFive',
        registrationMethod: 'custom',
        version: '1.0.0',
        baseURL: '/url-based',
      };
      // @ts-ignore
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(urlManifest),
      });
      initialize({
        appsConfig: {
          appFive: {
            name: 'appFive',
            manifestLocation: '/appFive/manifest.json',
            pluginManifest: embeddedManifest,
          },
        },
      });
      // @ts-ignore
      global.appFive = {
        init: jest.fn(),
        get: jest.fn().mockReturnValue(jest.fn().mockReturnValue(moduleExport)),
      };
      const result = await getModule('appFive', './module');
      expect(result).toBe('default-export');
      // Verify fetch was called with the manifestLocation URL, not the embedded manifest
      expect(global.fetch).toHaveBeenCalledWith('/appFive/manifest.json', expect.any(Object));
    });

    test('should load module using manifestLocation (URL-only)', async () => {
      // Return SDK-format manifest from URL so loadPlugin doesn't try to inject scripts
      const urlManifest: PluginManifest = {
        extensions: [],
        loadScripts: [],
        name: 'appThree',
        registrationMethod: 'custom',
        version: '1.0.0',
        baseURL: '/url-based',
      };
      // @ts-ignore
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(urlManifest),
      });
      initialize({
        appsConfig: {
          appThree: {
            name: 'appThree',
            manifestLocation: '/appThree/manifest.json',
          },
        },
      });
      // @ts-ignore
      global.appThree = {
        init: jest.fn(),
        get: jest.fn().mockReturnValue(jest.fn().mockReturnValue(moduleExport)),
      };
      const result = await getModule('appThree', './module');
      expect(result).toBe('default-export');
      expect(global.fetch).toHaveBeenCalledWith('/appThree/manifest.json', expect.any(Object));
    });

    test('should throw when scope has neither manifestLocation nor pluginManifest', async () => {
      initialize({
        appsConfig: {
          noManifest: {
            name: 'noManifest',
          },
        },
      });
      await expect(getModule('noManifest', './module')).rejects.toThrow('does not have a manifestLocation or pluginManifest');
    });

    test('should resolve named export from embedded manifest', async () => {
      const embeddedManifest: PluginManifest = {
        extensions: [],
        loadScripts: [],
        name: 'appFour',
        registrationMethod: 'custom',
        version: '1.0.0',
        baseURL: '/foo/bar',
      };
      initialize({
        appsConfig: {
          appFour: {
            name: 'appFour',
            pluginManifest: embeddedManifest,
          },
        },
      });
      // @ts-ignore
      global.appFour = {
        init: jest.fn(),
        get: jest.fn().mockReturnValue(jest.fn().mockReturnValue(moduleExport)),
      };
      const result = await getModule('appFour', './module', 'named');
      expect(result).toBe('named-export');
    });

    test('should throw when scope is not in configuration', async () => {
      initialize({
        appsConfig: {},
      });
      await expect(getModule('unknown', './module')).rejects.toThrow('is not in the scalprum configuration');
    });
  });
});

describe('custom loader configuration', () => {
  const createLoader = (): PluginLoaderInterface => ({
    loadPluginManifest: async () => ({
      name: 'fixture',
      version: '1.0.0',
      registrationMethod: 'custom',
      baseURL: '/fixtures/',
      loadScripts: [],
      extensions: [],
    }),
    transformPluginManifest: (manifest) => manifest,
    loadPlugin: async () => ({ success: true, loadedExtensions: [] }),
  });

  beforeEach(removeScalprum);
  afterEach(removeScalprum);

  test('rejects browser loader options instead of silently ignoring them', () => {
    expect(() =>
      initialize({
        appsConfig: {},
        loader: createLoader(),
        pluginLoaderOptions: { transformPluginManifest: (manifest) => manifest },
      }),
    ).toThrow('pluginLoaderOptions cannot be used with a custom loader');
  });

  test('requires a reset before changing the loader of an initialized store', () => {
    const loader = createLoader();
    initialize({ appsConfig: {}, loader });
    expect(() => initialize({ appsConfig: {}, loader: createLoader() })).toThrow('already initialized with a different loader');
    removeScalprum();
    expect(() => initialize({ appsConfig: {}, loader: createLoader() })).not.toThrow();
  });
});
