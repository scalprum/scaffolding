import React, { Fragment, useEffect, useState } from 'react';
import { ScalprumComponent, ScalprumProvider, useScalprum } from '@scalprum/react-core';
import { preloadModule } from '@scalprum/core';

const Initializer: React.ComponentType = ({ children }) => {
  const { initialized } = useScalprum();
  if (!initialized) {
    return <h1>Scalprum is loading</h1>;
  }

  return <Fragment>{children}</Fragment>;
};

// const preLoadModule = async (scope: string, module: string, processor?: (item: any) => string, skipCache = false) => {
//   const { manifestLocation } = getAppData(scope);
//   const cachedModule = getCachedModule(scope, module, skipCache);
//   let modulePromise = getPendingLoading(scope, module);
//   if (!modulePromise && !cachedModule && manifestLocation) {
//     modulePromise = processManifest(manifestLocation, scope, scope, processor).then(() => asyncLoader(scope, module));
//   }
//   return setPendingLoading('preLoad', './PreLoadedModule', Promise.resolve(modulePromise));
// };

const LoadingComponent: React.FC = () => {
  useEffect(() => {
    console.log('Loading component mounted');
  }, []);
  return <div>Super duper loading</div>;
};

const ContentStuff = () => {
  const [showPreLoadedModule, setShowPreLoadedModule] = useState(false);
  const handlePreload = async () => {
    try {
      await preloadModule('preLoad', './PreLoadedModule');
    } catch (error) {
      console.log('Unable to preload module: ', error);
    }
  };
  return (
    <>
      <div>
        <button onMouseEnter={handlePreload} onClick={() => setShowPreLoadedModule((prev) => !prev)}>
          Hower over this to pre-load; Click to show
        </button>
      </div>
      <ScalprumComponent LoadingComponent={LoadingComponent} appName="testApp" scope="testApp" module="./ModuleOne" />
      {showPreLoadedModule && <ScalprumComponent LoadingComponent={LoadingComponent} appName="preLoad" scope="preLoad" module="./PreLoadedModule" />}
    </>
  );
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
        preLoad: {
          name: 'preLoad',
          manifestLocation: '/pre-load-module-fed-mods.json',
        },
      }}
    >
      <Initializer>
        <ContentStuff />
      </Initializer>
    </ScalprumProvider>
  );
};

export default Entry;
