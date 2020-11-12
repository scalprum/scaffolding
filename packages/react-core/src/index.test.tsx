import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

import { useScalprum, ScalprumFeed, ScalprumState } from '.';

const SpyComponent: React.ComponentType<ScalprumState> = (props) => (
  <div>
    <pre>{JSON.stringify(props, null, 2)}</pre>
  </div>
);

const DummyComponent: React.ComponentType<{ feed: ScalprumFeed }> = ({ feed }) => {
  const state = useScalprum(feed);
  return (
    <MemoryRouter>
      <SpyComponent {...state} />
    </MemoryRouter>
  );
};

describe('useScalprum', () => {
  afterEach(() => cleanup());

  const config = { appOne: { name: 'appOne', appId: 'foo', elementId: 'element', rootLocation: '/foo/bar', scriptLocation: '/some/location' } };
  test('should set assing static scalprum feed to state and inititliaze component', () => {
    const { container } = render(<DummyComponent feed={config} />);
    expect(container).toMatchSnapshot();
  });

  test('should set scalprum feed from function', async () => {
    let container;
    await act(async () => {
      container = render(<DummyComponent feed={() => config} />)?.container;
    });
    expect(container).toMatchSnapshot();
  });

  test('should set scalprum feed from async function', async () => {
    let container;
    await act(async () => {
      container = render(<DummyComponent feed={() => Promise.resolve(config)} />)?.container;
    });
    expect(container).toMatchSnapshot();
  });
});
