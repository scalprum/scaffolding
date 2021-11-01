/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useEffect } from 'react';
import * as asyncComponent from './async-loader';
import { ScalprumComponent, ScalprumComponentProps } from './scalprum-component';
import { render, cleanup, act, screen } from '@testing-library/react';
import * as ScalprumCore from '@scalprum/core';
import { AppsConfig, GLOBAL_NAMESPACE } from '@scalprum/core';

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

  beforeEach(() => {
    loadComponentSpy = jest.spyOn(asyncComponent, 'loadComponent').mockReturnValue(() => import('./TestComponent'));
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
    ScalprumCore.setPendingInjection('appOne', jest.fn());
    render(<ScalprumComponent appName="appOne" scope="some" module="test" />);

    expect(getAppDataSpy).toHaveBeenCalledWith('appOne');
  });

  test('should retrieve manifest location', () => {
    getAppDataSpy.mockReturnValueOnce(mockInitScalpumConfigManifest.appOne);
    ScalprumCore.initialize({ appsConfig: mockInitScalpumConfigManifest });
    ScalprumCore.setPendingInjection('appOne', jest.fn());
    render(<ScalprumComponent appName="appOne" scope="some" module="test" />);

    expect(getAppDataSpy).toHaveBeenCalledWith('appOne');
  });

  test('should inject script and mount app if it was not initialized before', async () => {
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      return Promise.resolve(['', undefined]);
    });
    await act(async () => {
      render(<ScalprumComponent appName="appOne" scope="some" module="test" />);
    });
    expect(injectScriptSpy).toHaveBeenCalledWith('appOne', '/bar.js');
  });

  test('should inject manifest and mount app if it was not initialized before', async () => {
    getAppDataSpy.mockReturnValueOnce(mockInitScalpumConfigManifest.appOne);
    ScalprumCore.initialize({ appsConfig: mockInitScalpumConfigManifest });
    processManifestSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      return Promise.resolve([['', undefined]]);
    });
    await act(async () => {
      render(<ScalprumComponent appName="appOne" scope="some" module="test" />);
    });

    expect(processManifestSpy).toHaveBeenCalledWith('/bar.json', 'appOne', 'some', undefined);
  });

  test('should render test component', async () => {
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      return Promise.resolve(['', undefined]);
    });
    let container;

    const props: ScalprumComponentProps<{ apiProp: () => void }, { testProp: number }> = {
      testProp: 5,
      appName: 'appOne',
      scope: 'some',
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
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      return Promise.resolve([['', undefined]]);
    });
    let container;
    await act(async () => {
      container = render(<ScalprumComponent appName="appOne" scope="some" module="test" />)?.container;
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
    jest
      .spyOn(asyncComponent, 'loadComponent')
      .mockReturnValueOnce(() => new Promise((res) => setTimeout(() => res(import('./TestComponent')), 500)));
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      return Promise.resolve(['', undefined]);
    });

    const props: ScalprumComponentProps = {
      appName: 'appOne',
      scope: 'some',
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
    jest.spyOn(asyncComponent, 'loadComponent').mockReturnValueOnce(() =>
      import('./TestComponent').then(() => {
        throw 'foo';
      })
    );
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      return Promise.reject(['', undefined]);
    });

    const props: ScalprumComponentProps = {
      appName: 'appOne',
      scope: 'some',
      module: 'test',
      ErrorComponent: <h1>Custom error component</h1>,
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
      appName: 'appOne',
      scope: 'cachedScope',
      module: './test',
    };
    let container;
    await act(async () => {
      container = render(<ScalprumComponent {...props} />).container;
    });
    expect(container).toMatchSnapshot();
    expect(screen.getAllByTestId('cached-component')).toHaveLength(1);
    expect(loadComponentSpy).not.toHaveBeenCalled();
  });

  test('should skip scalprum cache', async () => {
    jest.useFakeTimers();
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      return Promise.resolve(['', undefined]);
    });
    const cachedModule = {
      __esModule: true,
      default: () => <div data-testid="cached-component">Cached component</div>,
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
      appName: 'appOne',
      scope: 'cachedScope',
      module: './test',
    };
    let container;
    await act(async () => {
      container = render(<ScalprumComponent {...props} skipCache />).container;
    });

    expect(container).toMatchSnapshot();
    expect(() => screen.getAllByTestId('cached-component')).toThrow();
    expect(loadComponentSpy).toHaveBeenCalled();
  });

  test('should try and re-render original component on first error', async () => {
    jest
      .spyOn(asyncComponent, 'loadComponent')
      .mockReturnValueOnce(() =>
        import('./TestComponent').then(() => {
          throw 'foo';
        })
      )
      .mockReturnValueOnce(() => import('./TestComponent'));
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      return Promise.resolve(['', undefined]);
    });

    const props: ScalprumComponentProps = {
      appName: 'appOne',
      scope: 'some',
      module: 'test',
      ErrorComponent: <h1>Custom error component</h1>,
    };
    let container;
    await act(async () => {
      container = render(<ScalprumComponent {...props} />).container;
    });
    expect(container).toMatchSnapshot();
  });

  test('should render error component if self-repair attempt fails', async () => {
    jest.useFakeTimers();
    loadComponentSpy.mockReturnValue(() =>
      import('./TestComponent').then(() => ({
        __esModule: true,
        default: () => {
          useEffect(() => {
            throw new Error('Expected runtime test error');
          }, []);
          return <div>Mocked testing component</div>;
        },
      }))
    );
    ScalprumCore.initialize({ appsConfig: mockInitScalprumConfig });
    injectScriptSpy.mockImplementation(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      return Promise.reject(['', undefined]);
    });
    let container;
    await act(async () => {
      container = render(
        <ScalprumComponent ErrorComponent={<h1>Custom error component</h1>} module="./TestComponent" scope="appOne" appName="appOne" />
      ).container;
    });

    await act(async () => {
      jest.advanceTimersToNextTimer();
    });

    expect(container).toMatchSnapshot();
  });
});
