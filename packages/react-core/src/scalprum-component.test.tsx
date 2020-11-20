import React from 'react';
import * as asyncComponent from './async-loader';
import { ScalprumComponent } from './scalprum-component';
import { render, cleanup, act } from '@testing-library/react';
import * as ScalprumCore from '@scalprum/core';
import * as Inject from '@scalprum/core/dist/cjs/inject-script';
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
  const getAppsByRootLocationSpy = jest.spyOn(ScalprumCore, 'getAppsByRootLocation').mockReturnValue([mockInitScalprumConfig.appOne]);
  const injectScriptSpy = jest.spyOn(Inject, 'injectScript');
  const loadComponentSpy = jest.spyOn(asyncComponent, 'loadComponent').mockReturnValue(() => import('./TestComponent'));

  afterEach(() => {
    cleanup();
    window[GLOBAL_NAMESPACE] = undefined;
    getAppsByRootLocationSpy.mockClear();
    injectScriptSpy.mockClear();
  });

  test('should retrieve script location', () => {
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    ScalprumCore.initializeApp({ name: 'appOne', id: 'id', mount: jest.fn(), unmount: jest.fn(), update: jest.fn() });
    render(<ScalprumComponent appName="appOne" path="/foo" scope="some" module="test" />);

    expect(getAppsByRootLocationSpy).toHaveBeenCalledWith('/foo');
  });

  test('should inject script and mount app if it was not initialized before', async () => {
    const mount = jest.fn();
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
      return Promise.resolve();
    });
    await act(async () => {
      render(<ScalprumComponent appName="appOne" path="/foo" scope="some" module="test" />);
    });

    expect(mount).toHaveBeenCalled();
    expect(injectScriptSpy).toHaveBeenCalledWith('appOne', '/bar.js');
  });

  test('should not inject script the app was initialized before', async () => {
    const mount = jest.fn();
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
    await act(async () => {
      render(<ScalprumComponent appName="appOne" path="/foo" scope="some" module="test" />);
    });

    expect(mount).toHaveBeenCalled();
    expect(injectScriptSpy).not.toHaveBeenCalled();
  });

  test('should render test component', async () => {
    const mount = jest.fn();
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
      return Promise.resolve();
    });
    let container;
    await act(async () => {
      container = render(<ScalprumComponent appName="appOne" path="/foo" scope="some" module="test" />)?.container;
    });

    expect(loadComponentSpy).toHaveBeenCalled();
    expect(container).toMatchSnapshot();
  });
});
