import React, { useEffect } from 'react';
import { Scalprum, getScalprum, initialize, removeScalprum } from '@scalprum/core';
import { ScalprumProvider } from './scalprum-provider';
import { ScalprumComponent } from './scalprum-component';

function mockModule(scalprum: Scalprum, moduleName: string) {
  // set new module directly to the exposedModules registry
  scalprum.exposedModules[moduleName] = {
    default: () => <div>{moduleName}</div>,
  };
}

describe('ScalprumProvider.cy.tsx', () => {
  beforeEach(() => {
    removeScalprum();
  });
  it('Should create scalprum provider from scalprum instance', () => {
    const scalprum = initialize({
      appsConfig: {
        foo: {
          manifestLocation: '/foo/manifest.json',
          name: 'foo',
        },
      },
    });

    mockModule(scalprum, 'foo#foo');
    cy.mount(
      <ScalprumProvider scalprum={scalprum}>
        <div>Test</div>
        <ScalprumComponent module="foo" scope="foo" />
      </ScalprumProvider>,
    );

    cy.contains('Test').should('exist');
    cy.contains('foo#foo').should('exist');
  });

  it('Should create scalprum provider from config props', () => {
    const InitComponent = () => {
      const [initialized, setInitialized] = React.useState(false);
      useEffect(() => {
        const scalprum = getScalprum();

        mockModule(scalprum, 'bar#bar');
        // ensure the mocked module is ready
        setTimeout(() => {
          setInitialized(true);
        });
      }, []);

      if (!initialized) {
        return <div>Not initialized</div>;
      }

      return <ScalprumComponent module="bar" scope="bar" />;
    };
    cy.mount(
      <ScalprumProvider
        config={{
          bar: {
            name: 'bar',
            manifestLocation: '/bar/manifest.json',
          },
        }}
      >
        <div>Test</div>
        <InitComponent />
      </ScalprumProvider>,
    );

    cy.contains('Test').should('exist');
    cy.contains('bar#bar').should('exist');
  });
});
