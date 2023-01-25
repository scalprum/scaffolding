import React, { Fragment, useState } from 'react';
import { ScalprumComponent, ScalprumProvider, useScalprum } from '@scalprum/react-core';
import { preloadModule } from '@scalprum/core';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import LoadingComponent from './components/LoadingComponent';
import RuntimeErrorRoute from './routes/RuntimeErrorRoute';

const Initializer: React.ComponentType = ({ children }) => {
  const { initialized } = useScalprum();
  if (!initialized) {
    return <h1>Scalprum is loading</h1>;
  }

  return <Fragment>{children}</Fragment>;
};

const ContentStuff = () => {
  const [showPreLoadedModule, setShowPreLoadedModule] = useState(false);
  const [showPreLoadedModuleWPF, setShowPreLoadedModuleWPF] = useState(false);

  const handlePreload = async () => {
    try {
      // await preloadModule('preLoad', './PreLoadedModule');
    } catch (error) {
      console.log('Unable to preload module: ', error);
    }
  };

  const handlePreloadPF = async () => {
    try {
      // await preloadModule('testApp', './ModuleOne');
    } catch (error) {
      console.log('Unable to preload module: ', error);
    }
  };
  return (
    <>
      <div>
        <button id="render-preload-module" onMouseEnter={handlePreload} onClick={() => setShowPreLoadedModule((prev) => !prev)}>
          Hover over this to pre-load; Click to show
        </button>
      </div>
      <div>
        <button id="render-prefetch-module" onMouseEnter={handlePreloadPF} onClick={() => setShowPreLoadedModuleWPF((prev) => !prev)}>
          Hover over this to pre-load and prefetch; Click to show
        </button>
      </div>
      <ScalprumComponent LoadingComponent={LoadingComponent} scope="testApp" module="./ModuleOne" />
      {showPreLoadedModule && <ScalprumComponent LoadingComponent={LoadingComponent} scope="preLoad" module="./PreLoadedModule" />}
      {showPreLoadedModuleWPF && <ScalprumComponent LoadingComponent={LoadingComponent} scope="testApp" module="./ModuleOne" />}
    </>
  );
};

const Entry = () => {
  return (
    <ScalprumProvider
      api={{
        chrome: {
          foo: 'bar',
          isBeta: () => true,
        },
      }}
      config={{
        testApp: {
          name: 'testApp',
          manifestLocation: '/test-app-fed-mods.json',
        },
        testModule: {
          name: 'testModule',
          manifestLocation: '/test-module-fed-mods.json',
        },
        preLoad: {
          name: 'preLoad',
          manifestLocation: '/pre-load-module-fed-mods.json',
        },
      }}
    >
      <BrowserRouter>
        <Initializer>
          <Switch>
            <Route path="/runtime-error">
              <RuntimeErrorRoute />
            </Route>
            <Route path="/">
              <ContentStuff />
            </Route>
          </Switch>
        </Initializer>
      </BrowserRouter>
    </ScalprumProvider>
  );
};

export default Entry;
