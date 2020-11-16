import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ScalprumRoute } from './scalprum-route';
import { render, cleanup, act } from '@testing-library/react';
import * as ScalprumCore from '@scalprum/core';
import { AppsConfig, GLOBAL_NAMESPACE } from '@scalprum/core';

describe('<ScalprumRoute />', () => {
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
  const injectScriptSpy = jest.spyOn(ScalprumCore, 'injectScript');

  afterEach(() => {
    cleanup();
    window[GLOBAL_NAMESPACE] = undefined;
    getAppsByRootLocationSpy.mockClear();
    injectScriptSpy.mockClear();
  });

  test('should retrieve script location', () => {
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    ScalprumCore.setPendingInjection('appOne', jest.fn());
    ScalprumCore.initializeApp({ name: 'appOne', id: 'id', mount: jest.fn(), unmount: jest.fn(), update: jest.fn() });
    render(
      <MemoryRouter>
        <ScalprumRoute appName="appOne" elementId="id" path="/foo" />
        <div id="id"></div>
      </MemoryRouter>
    );

    expect(getAppsByRootLocationSpy).toHaveBeenCalledWith('/foo');
  });

  test('should inject script and mount app if it was not initialized before', async () => {
    const mount = jest.fn();
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
      return Promise.resolve();
    });
    await act(async () => {
      render(
        <MemoryRouter>
          <ScalprumRoute appName="appOne" elementId="id" path="/foo" />
          <div id="id"></div>
        </MemoryRouter>
      );
    });

    expect(mount).toHaveBeenCalled();
    expect(injectScriptSpy).toHaveBeenCalledWith('appOne', '/bar.js');
  });

  test('should not inject script the app was initialized before', async () => {
    const mount = jest.fn();
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    ScalprumCore.setPendingInjection('appOne', jest.fn());
    ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
    await act(async () => {
      render(
        <MemoryRouter>
          <ScalprumRoute appName="appOne" elementId="id" path="/foo" />
          <div id="id"></div>
        </MemoryRouter>
      );
    });

    expect(mount).toHaveBeenCalled();
    expect(injectScriptSpy).not.toHaveBeenCalled();
  });
});
