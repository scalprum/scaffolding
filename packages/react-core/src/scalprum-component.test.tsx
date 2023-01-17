/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { ComponentType, useEffect } from 'react';
import * as asyncComponent from './async-loader';
import { ScalprumComponent, ScalprumComponentProps } from './scalprum-component';
import { render, cleanup, act, screen } from '@testing-library/react';
import * as ScalprumCore from '@scalprum/core';
import { AppsConfig, GLOBAL_NAMESPACE } from '@scalprum/core';
import TestComponent from './TestComponent';

const flushPromise = () => Promise.resolve(setTimeout);
const ErrorComponent = () => {
  return <h1>Custom error component</h1>;
};

describe('<ScalprumComponent />', () => {
  const mockInitScalprumConfig: AppsConfig = {
    appOne: {
      name: 'appOne',
      appId: 'appOne',
      rootLocation: '/foo',
      scriptLocation: '/bar.js',
      elementId: 'id',
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
  };
  const getAppDataSpy = jest.spyOn(ScalprumCore, 'getAppData').mockReturnValue(mockInitScalprumConfig.appOne);
  const injectScriptSpy = jest.spyOn(ScalprumCore, 'injectScript');
  const processManifestSpy = jest.spyOn(ScalprumCore, 'processManifest');
  let loadComponentSpy: jest.SpyInstance;

  beforeAll(() => {
    global.fetch = () =>
      Promise.resolve({
        json: () => Promise.resolve({}),
      }) as unknown as Promise<Response>;
  });

  beforeEach(() => {
    const componentPromise = Promise.resolve({ prefetch: undefined, component: TestComponent });
    loadComponentSpy = jest.spyOn(asyncComponent, 'loadComponent').mockReturnValue(componentPromise);
  });

  afterEach(() => {
    cleanup();
    window[GLOBAL_NAMESPACE] = undefined;
    getAppDataSpy.mockClear();
    injectScriptSpy.mockClear();
    processManifestSpy.mockClear();
    loadComponentSpy.mockReset();
  });

  test('should retrieve script location', () => {
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    ScalprumCore.setPendingInjection('appOne', Promise.resolve());
    render(<ScalprumComponent scope="appOne" module="test" />);

    expect(getAppDataSpy).toHaveBeenCalledWith('appOne');
  });

  test('should retrieve manifest location', () => {
    getAppDataSpy.mockReturnValueOnce(mockInitScalpumConfigManifest.appOne);
    ScalprumCore.initialize({ appsConfig: mockInitScalpumConfigManifest });
    ScalprumCore.setPendingInjection('appOne', Promise.resolve());
    render(<ScalprumComponent scope="appOne" module="test" />);

    expect(getAppDataSpy).toHaveBeenCalledWith('appOne');
  });

  test('should inject script and mount app if it was not initialized before', async () => {
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', Promise.resolve());
      return Promise.resolve(['', undefined]);
    });
    await act(async () => {
      await render(<ScalprumComponent scope="appOne" module="test" />);
    });

    await act(async () => {
      await flushPromise();
    });
    expect(injectScriptSpy).toHaveBeenCalledWith('appOne', '/bar.js');
  });

  test('should inject manifest and mount app if it was not initialized before', async () => {
    getAppDataSpy.mockReturnValueOnce(mockInitScalpumConfigManifest.appOne);
    ScalprumCore.initialize({ appsConfig: mockInitScalpumConfigManifest });
    processManifestSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', Promise.resolve());
      return Promise.resolve([['', undefined]]);
    });
    await act(async () => {
      render(<ScalprumComponent scope="appOne" module="test" />);
    });

    expect(processManifestSpy).toHaveBeenCalledWith('/bar.json', 'appOne', undefined);
  });

  test('should render test component', async () => {
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', Promise.resolve());
      return Promise.resolve(['', undefined]);
    });
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
      ScalprumCore.setPendingInjection('appOne', Promise.resolve());
      return Promise.resolve([['', undefined]]);
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
    jest.useFakeTimers();
    /**
     * We need the async component "hang" to render the fallback
     */

    const componentPromise = new Promise<{ prefetch: Promise<any> | undefined; component: ComponentType<any> }>((res) =>
      setTimeout(() => res({ prefetch: undefined, component: TestComponent }), 500)
    );
    jest.spyOn(asyncComponent, 'loadComponent').mockReturnValueOnce(componentPromise);
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', Promise.resolve());
      return Promise.resolve(['', undefined]);
    });

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
    const componentPromise = Promise.resolve({ prefetch: undefined, component: TestComponent });
    jest.spyOn(asyncComponent, 'loadComponent').mockReturnValueOnce(
      componentPromise.then(() => ({
        prefetch: undefined,
        component: () => {
          throw 'foo';
        },
      }))
    );
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', Promise.resolve());
      return Promise.reject(['', undefined]);
    });

    const props: ScalprumComponentProps = {
      scope: 'appOne',
      module: 'test',
      ErrorComponent: <ErrorComponent />,
    };
    let container;
    await act(async () => {
      container = render(<ScalprumComponent {...props} />).container;
    });
    expect(container).toMatchSnapshot();
  });

  test('should retrieve module from scalprum cache', async () => {
    const cachedModule = {
      __esModule: true,
      default: () => <div data-testid="cached-component">Cached component</div>,
      prefetch: () => Promise.resolve(),
    };
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    // @ts-ignore
    global.__webpack_init_sharing__ = jest.fn();
    // @ts-ignore
    global.__webpack_share_scopes__ = {
      default: jest.fn(),
    };
    // @ts-ignore
    global.cachedScope = {
      init: jest.fn(),
      get: jest.fn().mockReturnValue(() => cachedModule),
    };
    await ScalprumCore.asyncLoader('cachedScope', './test');

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

  test('should skip scalprum cache', async () => {
    jest.useFakeTimers();
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', Promise.resolve());
      return Promise.resolve(['', undefined]);
    });
    const cachedModule = {
      __esModule: true,
      default: () => <div data-testid="cached-component">Cached component</div>,
      prefetch: () => Promise.resolve(),
    };
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    // @ts-ignore
    global.__webpack_init_sharing__ = jest.fn();
    // @ts-ignore
    global.__webpack_share_scopes__ = {
      default: jest.fn(),
    };
    // @ts-ignore
    global.cachedScope = {
      init: jest.fn(),
      get: jest.fn().mockReturnValue(() => cachedModule),
    };
    await ScalprumCore.asyncLoader('cachedScope', './test');

    const props: ScalprumComponentProps = {
      scope: 'cachedScope',
      module: './test',
    };
    let container;
    await act(async () => {
      container = await render(<ScalprumComponent {...props} skipCache />).container;
    });

    await act(async () => {
      await flushPromise();
    });

    expect(loadComponentSpy).toHaveBeenCalled();
    expect(() => screen.getAllByTestId('cached-component')).toThrow();
    expect(container).toMatchSnapshot();
  });

  test('should try and re-render original component on first error', async () => {
    const componentPromise = Promise.resolve({ prefetch: undefined, component: TestComponent });
    jest
      .spyOn(asyncComponent, 'loadComponent')
      .mockReturnValueOnce(
        componentPromise.then(() => ({
          prefetch: undefined,
          component: () => {
            throw 'foo';
          },
        }))
      )
      .mockReturnValueOnce(componentPromise);
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', Promise.resolve());
      return Promise.resolve(['', undefined]);
    });

    const props: ScalprumComponentProps = {
      scope: 'appOne',
      module: 'test',
      ErrorComponent: <ErrorComponent />,
    };
    let container;
    await act(async () => {
      container = render(<ScalprumComponent {...props} />).container;
    });

    await act(async () => {
      await flushPromise();
    });

    expect(container).toMatchSnapshot();
  });

  test('should render error component if self-repair attempt fails', async () => {
    // uncomment if you want to see scalprum errors and warnings
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.useFakeTimers();
    const componentPromise = Promise.resolve({ prefetch: undefined, component: TestComponent });
    loadComponentSpy.mockReturnValue(
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
    injectScriptSpy.mockImplementation(() => {
      ScalprumCore.setPendingInjection('appOne', Promise.resolve());
      return Promise.reject(['', undefined]);
    });
    let container;
    await act(async () => {
      container = render(<ScalprumComponent ErrorComponent={<ErrorComponent />} module="./TestComponent" scope="appOne" />).container;
    });

    await act(async () => {
      jest.advanceTimersToNextTimer();
    });

    expect(container).toMatchSnapshot();
  });
});
