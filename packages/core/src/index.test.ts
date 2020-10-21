import { initialize, GLOBAL_NAMESPACE, initializeApp, getApp, getAppsByRootLocation } from '.';

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
      },
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
    expect(mount).toHaveBeenCalledTimes(1);
  });

  test('should retrive one app by name', () => {
    initialize(mockInititliazeConfig);
    initializeApp({ ...mockInitializeAppConfig });

    const app = getApp('foo');
    expect(app).toEqual({
      mount: expect.any(Function),
      unmount: expect.any(Function),
      update: expect.any(Function),
      nodeId: 'foo',
    });
  });

  test('should retrive multiple apps root location', () => {
    initialize(mockInititliazeConfig);
    initializeApp({ ...mockInitializeAppConfig });

    const apps = getAppsByRootLocation('/foo/bar');
    expect(apps).toEqual([
      { appId: 'app-one', elementId: 'app-one-element', name: 'appOne', rootLocation: '/foo/bar', scriptLocation: '/appOne/url' },
      { appId: 'app-two', elementId: 'app-two-element', name: 'appTwo', rootLocation: '/foo/bar', scriptLocation: '/appTwo/url' },
    ]);
  });
});
