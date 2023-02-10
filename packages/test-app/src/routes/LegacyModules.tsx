import { preloadModule } from '@scalprum/core';
import { ScalprumComponent } from '@scalprum/react-core';
import React, { useState } from 'react';
import LoadingComponent from '../components/LoadingComponent';

const LegacyModules = () => {
  const [showPreLoadedModule, setShowPreLoadedModule] = useState(false);
  const [showPreLoadedModuleWPF, setShowPreLoadedModuleWPF] = useState(false);

  const handlePreload = async () => {
    try {
      await preloadModule('preLoad', './PreLoadedModule');
    } catch (error) {
      console.log('Unable to preload module: ', error);
    }
  };

  const handlePreloadPF = async () => {
    try {
      await preloadModule('testApp', './ModuleOne');
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

export default LegacyModules;
