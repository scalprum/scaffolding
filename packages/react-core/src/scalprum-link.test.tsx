import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, cleanup, getByText } from '@testing-library/react';
import * as ScalprumCore from '@scalprum/core';

import { ScalprumLink, ScalprumLinkProps } from './scalprum-link';

const DummyComponent: React.ComponentType<ScalprumLinkProps & { initialEntries?: string[] }> = ({ initialEntries, ...props }) => {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ScalprumLink id="scalprum-link" {...props}>
        link
      </ScalprumLink>
    </MemoryRouter>
  );
};
describe('<ScalprumLink />', () => {
  afterEach(() => cleanup());

  test('should not call onmount function', () => {
    const unmount = jest.fn();
    const { container } = render(<DummyComponent to="/foo" shouldUnmount={false} unmount={unmount} />);
    const link = getByText(container, 'link');
    link.click();

    expect(unmount).not.toHaveBeenCalled();
  });

  test('should not call onmount function on click', () => {
    const unmount = jest.fn();
    const { container } = render(<DummyComponent to="/foo" shouldUnmount unmount={unmount} />);
    const link = getByText(container, 'link');
    link.click();

    expect(unmount).toHaveBeenCalledTimes(1);
  });

  test('should evaluate shouldUnmount function and call onmount function on click', () => {
    const unmount = jest.fn();
    const { container } = render(<DummyComponent to="/foo" shouldUnmount={() => true} unmount={unmount} />);
    const link = getByText(container, 'link');
    link.click();

    expect(unmount).toHaveBeenCalledTimes(1);
  });

  test('should evaluate shouldUnmount function and not call onmount function on click', () => {
    const unmount = jest.fn();
    const { container } = render(<DummyComponent to="/foo" shouldUnmount={() => false} unmount={unmount} />);
    const link = getByText(container, 'link');
    link.click();

    expect(unmount).not.toHaveBeenCalled();
  });

  test('should call link onClick function', () => {
    const onClick = jest.fn();
    const { container } = render(<DummyComponent to="/foo" shouldUnmount={false} onClick={onClick} />);
    const link = getByText(container, 'link');
    link.click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('should call unmount if pathnames do not match', () => {
    const unmount = jest.fn();
    const { container } = render(<DummyComponent initialEntries={['/bar']} to="/foo" unmount={unmount} />);
    const link = getByText(container, 'link');
    link.click();

    expect(unmount).toHaveBeenCalledTimes(1);
  });

  test('should call unmount if router pathname do not match location object pathname', () => {
    const unmount = jest.fn();
    const { container } = render(<DummyComponent initialEntries={['/bar']} to={{ pathname: '/foo' }} unmount={unmount} />);
    const link = getByText(container, 'link');
    link.click();

    expect(unmount).toHaveBeenCalledTimes(1);
  });

  test('should not call unmount if pathnames do match', () => {
    const unmount = jest.fn();
    const { container } = render(<DummyComponent initialEntries={['/foo']} to="/foo" unmount={unmount} />);
    const link = getByText(container, 'link');
    link.click();

    expect(unmount).not.toHaveBeenCalled();
  });

  test('should call "unmountAppsFromRoute" if no unmount prop was passed', () => {
    const unmountAppsFromRouteSpy = jest.spyOn(ScalprumCore, 'unmountAppsFromRoute');
    const unmount = jest.fn();
    /**
     * Initialize scalprum
     */
    ScalprumCore.initialize({
      scalpLets: {
        appOne: {
          name: 'appOne',
          rootLocation: '/bar',
          appId: 'appOne',
          elementId: 'id',
          scriptLocation: '/bla',
        },
      },
    });

    ScalprumCore.initializeApp({ id: 'id', name: 'appOne', mount: jest.fn(), unmount, update: jest.fn() });
    const { container } = render(<DummyComponent initialEntries={['/bar']} to={{ pathname: '/foo' }} />);
    const link = getByText(container, 'link');
    link.click();

    expect(unmountAppsFromRouteSpy).toHaveBeenCalledTimes(1);
    expect(unmountAppsFromRouteSpy).toHaveBeenCalledWith('/bar');
    expect(unmount).toHaveBeenCalledTimes(1);
    unmountAppsFromRouteSpy.mockRestore();
  });
});
