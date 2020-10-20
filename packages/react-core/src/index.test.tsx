import React from 'react';
import { render, cleanup } from '@testing-library/react';

import useScalprum, { ScalprumFeed, ScalprumState } from '.';

const SpyComponent: React.ComponentType<ScalprumState> = (props) => (
  <div>
    <pre>{JSON.stringify(props, null, 2)}</pre>
  </div>
);

const DummyComponent: React.ComponentType<{ feed: ScalprumFeed }> = ({ feed }) => {
  const state = useScalprum(feed);
  return <SpyComponent {...state} />;
};

describe('useScalprum', () => {
  afterEach(() => cleanup());

  test('should set assing static scalprum feed to state and inititliaze component', () => {
    const { container } = render(<DummyComponent feed={[{ appId: 'foo', elementId: 'element', rootLocation: '/foo/bar' }]} />);
    expect(container).toMatchSnapshot();
  });

  test('should set scalprum feed from function', () => {
    const { container } = render(<DummyComponent feed={() => [{ appId: 'foo', elementId: 'element', rootLocation: '/foo/bar' }]} />);
    expect(container).toMatchSnapshot();
  });

  test('should set scalprum feed from async function', () => {
    const { container } = render(<DummyComponent feed={() => Promise.resolve([{ appId: 'foo', elementId: 'element', rootLocation: '/foo/bar' }])} />);
    expect(container).toMatchSnapshot();
  });
});
