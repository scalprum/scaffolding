/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { ComponentType, useEffect } from 'react';
import * as asyncComponent from './async-loader';
import { ScalprumComponent, ScalprumComponentProps } from './scalprum-component';
import { render, cleanup, act, screen } from '@testing-library/react';
import * as ScalprumCore from '@scalprum/core';
import { AppsConfig } from '@scalprum/core';
import TestComponent from './TestComponent';
import { PluginManifest } from '@openshift/dynamic-plugin-sdk';

const ErrorComponent = () => {
  return <h1>Custom error component</h1>;
};

describe('<ScalprumComponent />', () => {
  const testManifest: PluginManifest = {
    extensions: [],
    loadScripts: [],
    name: 'testApp',
    registrationMethod: 'custom',
    version: '1.0.0',
    baseURL: '/',
  };
  const mockInitScalprumConfig: AppsConfig = {
    appOne: {
      name: 'appOne',
      manifestLocation: '/bar.js',
    },
    error: {
      name: 'error',
      manifestLocation: '/bar.js',
    },
    errorSelfRepair: {
      name: 'errorSelfRepair',
      manifestLocation: '/errorSelfRepair.js',
    },
    errorRepairSuccess: {
      name: 'errorRepairSuccess',
      manifestLocation: '/errorRepairSuccess,js',
    },
  };

  const mockInitScalpumConfigManifest: AppsConfig = {
    appOne: {
      name: 'appOne',
      appId: 'appOne',
      rootLocation: '/foo',
      manifestLocation: '/bar.json',
      elementId: 'id',
    },
    error: {
      name: 'error',
      manifestLocation: '/bar.js',
    },
    errorSelfRepair: {
      name: 'errorSelfRepair',
      manifestLocation: '/errorSelfRepair.js',
    },
    errorRepairSuccess: {
      name: 'errorRepairSuccess',
      manifestLocation: '/errorRepairSuccess,js',
    },
  };
  const getAppDataSpy = jest.spyOn(ScalprumCore, 'getAppData').mockReturnValue(mockInitScalprumConfig.appOne);
  const processManifestSpy = jest.spyOn(ScalprumCore, 'processManifest');
  let loadComponentSpy: jest.SpyInstance;

  beforeAll(() => {
    // @ts-ignore
    global.__webpack_share_scopes__ = {
      default: {},
    };
    // @ts-ignore
    global.__webpack_init_sharing__ = () => undefined;
    global.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            appOne: {
              entry: [],
            },
            errorSelfRepair: {
              entry: [],
            },
            errorRepairSuccess: {
              entry: [],
            },
          }),
      }) as unknown as Promise<Response>;
  });

  beforeEach(() => {
    const componentPromise = Promise.resolve({ prefetch: undefined, component: TestComponent });
    loadComponentSpy = jest.spyOn(asyncComponent, 'loadComponent').mockReturnValue(componentPromise);
  });

  afterEach(() => {
    cleanup();
    getAppDataSpy.mockClear();
    processManifestSpy.mockClear();
    loadComponentSpy.mockReset();
  });

  test('should retrieve script location', async () => {
    processManifestSpy.mockImplementationOnce(() => Promise.resolve());
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    await act(async () => {
      await render(<ScalprumComponent scope="appOne" module="test" />);
    });

    expect(getAppDataSpy).toHaveBeenCalledWith('appOne');
  });

  test('should retrieve manifest location', async () => {
    processManifestSpy.mockImplementationOnce(() => Promise.resolve());
    getAppDataSpy.mockReturnValueOnce(mockInitScalpumConfigManifest.appOne);
    ScalprumCore.initialize({ appsConfig: mockInitScalpumConfigManifest });
    await act(async () => {
      await render(<ScalprumComponent scope="appOne" module="test" />);
    });

    expect(getAppDataSpy).toHaveBeenCalledWith('appOne');
  });

  test('should inject manifest and mount app if it was not initialized before', async () => {
    getAppDataSpy.mockReturnValueOnce(mockInitScalpumConfigManifest.appOne);
    ScalprumCore.initialize({ appsConfig: mockInitScalpumConfigManifest });
    processManifestSpy.mockImplementationOnce(() => {
      return Promise.resolve();
    });
    await act(async () => {
      render(<ScalprumComponent scope="appOne" module="test" />);
    });

    expect(processManifestSpy).toHaveBeenCalledWith('/bar.json', 'appOne', 'test', undefined);
  });

  test('should render test component', async () => {
    processManifestSpy.mockImplementationOnce(() => Promise.resolve());
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    let container;

    const props: ScalprumComponentProps<{ apiProp: () => void }, { testProp: number }> = {
      testProp: 5,
      scope: 'appOne',
      module: 'test',
      api: {
        apiProp: () => undefined,
      },
    };
    await act(async () => {
      container = render(<ScalprumComponent {...props} />)?.container;
      expect(container).toMatchSnapshot();
    });

    expect(loadComponentSpy).toHaveBeenCalled();
    expect(container).toMatchSnapshot();
  });

  test('should render test component with manifest', async () => {
    jest.useFakeTimers();
    getAppDataSpy.mockReturnValueOnce(mockInitScalpumConfigManifest.appOne);
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    processManifestSpy.mockImplementationOnce(() => {
      return Promise.resolve();
    });
    let container;
    await act(async () => {
      container = render(<ScalprumComponent scope="appOne" module="test" />)?.container;
    });

    expect(loadComponentSpy).toHaveBeenCalled();

    /**
     * Wait for the loading promise to be resolved
     */
    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    expect(container).toMatchSnapshot();
  });

  test('should render fallback component', async () => {
    jest.spyOn(global, 'fetch').mockImplementationOnce(
      () =>
        new Promise((res) => {
          setTimeout(() => {
            res({
              ok: true,
              json: () =>
                Promise.resolve({
                  appOne: {
                    entry: [],
                  },
                }),
            } as unknown as Promise<Response>);
          }, 500);
        })
    );
    jest.useFakeTimers();
    /**
     * We need the async component "hang" to render the fallback
     */

    const componentPromise = new Promise<{ prefetch: (() => Promise<any>) | undefined; component: ComponentType<any> }>((res) =>
      setTimeout(() => res({ prefetch: undefined, component: TestComponent }), 500)
    );
    jest.spyOn(asyncComponent, 'loadComponent').mockReturnValueOnce(componentPromise);
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });

    const props: ScalprumComponentProps = {
      scope: 'appOne',
      module: 'test',
      LoadingComponent: () => <h1>Loading</h1>,
      fallback: <h1>Suspense fallback</h1>,
    };
    const { container } = render(<ScalprumComponent {...props} />);
    /**
     * Should render Loading component
     */
    expect(container).toMatchSnapshot();
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    /**
     * Should render fallback component
     */
    expect(container).toMatchSnapshot();
  });

  test('should render error component', async () => {
    processManifestSpy.mockImplementation(() => Promise.resolve());
    const componentPromise = Promise.resolve({ prefetch: undefined, component: TestComponent });
    const asyncComponentSpy = jest
      .spyOn(asyncComponent, 'loadComponent')
      .mockReturnValueOnce(
        componentPromise.then(() => ({
          prefetch: undefined,
          component: () => {
            throw 'should render error component';
          },
        }))
      )
      .mockReturnValueOnce(
        componentPromise.then(() => ({
          prefetch: undefined,
          component: () => {
            throw 'should render error component';
          },
        }))
      );
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });

    const props: ScalprumComponentProps = {
      scope: 'error',
      module: 'test',
      ErrorComponent: <ErrorComponent />,
    };
    let container;
    await act(async () => {
      container = render(<ScalprumComponent {...props} />).container;
    });
    expect(container).toMatchSnapshot();
    asyncComponentSpy.mockRestore();
  });

  test('should retrieve module from scalprum cache', async () => {
    processManifestSpy.mockImplementation(() => Promise.resolve());
    const cachedModule = {
      __esModule: true,
      default: () => <div data-testid="cached-component">Cached component</div>,
      prefetch: () => Promise.resolve(),
    };
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    ScalprumCore.getScalprum().exposedModules[`cachedScope#./test`] = cachedModule;
    await ScalprumCore.getScalprum().pluginStore.loadPlugin('http://foobar', testManifest);

    const props: ScalprumComponentProps = {
      scope: 'cachedScope',
      module: './test',
    };
    let container;
    await act(async () => {
      container = render(<ScalprumComponent {...props} />).container;
    });
    expect(loadComponentSpy).not.toHaveBeenCalled();
    expect(container).toMatchSnapshot();
    expect(screen.getAllByTestId('cached-component')).toHaveLength(1);
  });

  test('should try and re-render original component on first error', async () => {
    // we need two mocks for reload attempt
    processManifestSpy.mockImplementation(() => Promise.resolve());
    const componentPromise = Promise.resolve({ prefetch: undefined, component: TestComponent });
    const asyncComponentSpy = jest.spyOn(asyncComponent, 'loadComponent').mockReturnValueOnce(
      componentPromise.then(() => ({
        prefetch: undefined,
        component: () => {
          throw 're-render initial error';
        },
      }))
    );
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });

    const props: ScalprumComponentProps = {
      scope: 'errorRepairSuccess',
      module: 'test',
      ErrorComponent: <ErrorComponent />,
    };
    let container;
    await act(async () => {
      container = render(<ScalprumComponent {...props} />).container;
    });

    expect(container).toMatchSnapshot();
    asyncComponentSpy.mockRestore();
  });

  test('should render error component if self-repair attempt fails', async () => {
    // uncomment if you want to see scalprum errors and warnings
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    processManifestSpy.mockImplementation(() => Promise.reject('Initial fail'));
    const componentPromise = Promise.resolve({ prefetch: undefined, component: TestComponent });
    loadComponentSpy.mockReturnValueOnce(
      componentPromise.then(() => ({
        __esModule: true,
        default: () => {
          useEffect(() => {
            throw new Error('Expected runtime test error');
          }, []);
          return <div>Mocked testing component</div>;
        },
        prefetch: () => Promise.resolve(),
      }))
    );
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    let container;
    await act(async () => {
      container = await render(<ScalprumComponent ErrorComponent={<ErrorComponent />} module="./TestComponent" scope="errorSelfRepair" />).container;
    });

    expect(container).toMatchSnapshot();
  });
});
