import React, { PropsWithChildren } from 'react';
import { render, cleanup, act, screen } from '@testing-library/react';

import { ScalprumComponent, ScalprumProvider, useScalprum } from '@scalprum/react-core';
import { AppsConfig, removeScalprum } from '@scalprum/core';
import { DEFAULT_MODULE_TEST_ID, mockPluginData } from '@scalprum/react-test-utils';

const InitGate = ({ children }: PropsWithChildren<{}>) => {
  const { initialized } = useScalprum();
  if (!initialized) {
    return null;
  }
  return <>{children}</>;
};
const TestComponent = ({ config = {}, children }: PropsWithChildren<{ config?: AppsConfig }>) => {
  return (
    <ScalprumProvider config={config}>
      <div data-testid="static-child">Test</div>
      <InitGate>{children}</InitGate>
    </ScalprumProvider>
  );
};

describe('ScalprumProvider renders', () => {
  afterEach(() => {
    cleanup();
    removeScalprum();
  });
  it('renders without crashing with mocked webpack and no config', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('static-child')).toBeInTheDocument();
  });

  it(`fetches manifest for 'TestPlugin'`, async () => {
    const { response, TestScalprumProvider } = mockPluginData();
    jest.spyOn(global, 'fetch').mockImplementationOnce(() => Promise.resolve(response));
    await act(async () => {
      await render(
        <TestScalprumProvider>
          <ScalprumComponent scope={'test-plugin'} module="ExposedModule" />
        </TestScalprumProvider>
      );
    });
    expect(screen.getByTestId(DEFAULT_MODULE_TEST_ID)).toBeInTheDocument();
  });
});
