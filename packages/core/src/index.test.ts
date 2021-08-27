/* eslint-disable @typescript-eslint/ban-ts-comment */
import { initialize, GLOBAL_NAMESPACE, initializeApp, getApp, getScalprum, setActiveApp, unmountAll, removeActiveApp } from '.';

describe('scalprum', () => {
  const mockInititliazeConfig = {
    scalpLets: {
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
  const mockInitializeAppConfig = { id: 'foo', name: 'foo', mount: jest.fn(), unmount: jest.fn(), update: jest.fn() };

  afterEach(() => {
    // @ts-ignore
    global[GLOBAL_NAMESPACE] = undefined;
  });

  test('should initialize scalprum with apps config', () => {
    initialize(mockInititliazeConfig);

    const expectedResult = {
      apps: {},
      appsMetaData: {
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
      pendingInjections: {},
      scalpletRoutes: {
        '/foo/bar': ['appOne', 'appTwo', 'appThree'],
      },
      activeApps: {},
    };

    // @ts-ignore
    expect(global[GLOBAL_NAMESPACE]).toEqual(expectedResult);
  });

  test('should not initialize app if scalprum was not initialized', () => {
    expect(() => initializeApp(mockInitializeAppConfig)).toThrowError('Cannot inititlize app. Scalprum was not inititliazed!');
  });

  test('should initialize app', () => {
    const mount = jest.fn();
    initialize(mockInititliazeConfig);
    // @ts-ignore
    global[GLOBAL_NAMESPACE].pendingInjections = {
      foo: jest.fn(),
    };
    initializeApp({ ...mockInitializeAppConfig, mount });
    // @ts-ignore
    expect(global[GLOBAL_NAMESPACE].apps).toEqual({
      foo: {
        mount: expect.any(Function),
        unmount: expect.any(Function),
        update: expect.any(Function),
        nodeId: 'foo',
      },
    });
  });

  test('should retrive one app by name', () => {
    initialize(mockInititliazeConfig);
    // @ts-ignore
    global[GLOBAL_NAMESPACE].pendingInjections = {
      foo: jest.fn(),
    };
    initializeApp({ ...mockInitializeAppConfig });

    const app = getApp('foo');
    expect(app).toEqual({
      mount: expect.any(Function),
      unmount: expect.any(Function),
      update: expect.any(Function),
      nodeId: 'foo',
    });
  });

  test('should pass scalprum object to application on mount', () => {
    const mount = jest.fn();
    initialize(mockInititliazeConfig);
    // @ts-ignore
    global[GLOBAL_NAMESPACE].pendingInjections = {
      foo: jest.fn(),
    };
    initializeApp({ ...mockInitializeAppConfig, mount });
    const app = getApp('foo');
    app.mount();
    expect(mount).toHaveBeenCalledWith(window[GLOBAL_NAMESPACE]);
  });

  test('should pass scalprum object with custom API to application on mount', () => {
    const mount = jest.fn();
    initialize(mockInititliazeConfig);
    // @ts-ignore
    global[GLOBAL_NAMESPACE].pendingInjections = {
      foo: jest.fn(),
    };
    initializeApp<{ foo: string }>({ ...mockInitializeAppConfig, mount });
    const app = getApp<{ foo: string }>('foo');
    app.mount({ foo: 'bar' });
    expect(mount).toHaveBeenCalledWith({
      ...window[GLOBAL_NAMESPACE],
      foo: 'bar',
    });
  });

  test('getScalprum should return the scalprum object', () => {
    initialize(mockInititliazeConfig);
    const restult = getScalprum();
    expect(restult).toEqual(expect.any(Object));
  });

  test('should call unmount on all active applications', () => {
    const unmount = jest.fn();
    initialize(mockInititliazeConfig);
    // @ts-ignore
    global[GLOBAL_NAMESPACE].pendingInjections = {
      appOne: jest.fn(),
      appTwo: jest.fn(),
      appThree: jest.fn(),
    };
    initializeApp({ ...mockInitializeAppConfig, name: 'appOne', unmount });
    initializeApp({ ...mockInitializeAppConfig, name: 'appTwo', unmount });
    initializeApp({ ...mockInitializeAppConfig, name: 'appThree', unmount });

    setActiveApp('appOne');
    setActiveApp('appTwo');
    setActiveApp('appThree');
    removeActiveApp('appThree');
    unmountAll();
    expect(unmount).toHaveBeenCalledTimes(2);
  });
});
