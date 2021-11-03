import React, { Fragment } from 'react';
import { ScalprumComponent, ScalprumProvider, useScalprum } from '@scalprum/react-core';

const Initializer: React.ComponentType = ({ children }) => {
  const { initialized } = useScalprum();
  if (!initialized) {
    return <h1>Scalprum is loading</h1>;
  }

  return <Fragment>{children}</Fragment>;
};

const Entry = () => {
  return (
    <ScalprumProvider
      config={{
        testApp: {
          name: 'testApp',
          manifestLocation: '/test-app-fed-mods.json',
        },
        testModule: {
          name: 'testModule',
          manifestLocation: '/test-module-fed-mods.json',
        },
      }}
    >
      <Initializer>
        <ScalprumComponent appName="testApp" scope="testApp" module="./ModuleFour" />
      </Initializer>
    </ScalprumProvider>
  );
};

export default Entry;
