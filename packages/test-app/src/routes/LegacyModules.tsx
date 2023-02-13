import { Box, Button, Stack } from '@mui/material';
import { preloadModule } from '@scalprum/core';
import { ScalprumComponent } from '@scalprum/react-core';
import React, { PropsWithChildren, useState } from 'react';
import GridLayout from 'react-grid-layout';
import LoadingComponent from '../components/LoadingComponent';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const BoxWrapper: React.FC<PropsWithChildren<{}>> = ({ children }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', justifyItems: 'center' }}>{children}</Box>
);

const LegacyModules = () => {
  const [showPreLoadedModule, setShowPreLoadedModule] = useState(false);
  const [showPreLoadedModuleWPF, setShowPreLoadedModuleWPF] = useState(false);
  const [layout, setLayout] = useState<GridLayout.Layout[]>([{ isResizable: false, isDraggable: false, i: 'initial', x: 0, y: 0, w: 1, h: 3 }]);

  const toggles = {
    preLoad: { value: showPreLoadedModule, toggle: setShowPreLoadedModule },
    preFetch: { value: showPreLoadedModuleWPF, toggle: setShowPreLoadedModuleWPF },
  };

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

  const handleToggleElement = (name: keyof typeof toggles) => {
    const { value, toggle } = toggles[name];
    toggle(!value);
    if (!value) {
      // add new item by id
      setLayout((prev) => {
        const newItem: GridLayout.Layout = {
          i: name,
          x: prev.length % 2,
          y: Infinity, // put last
          w: 1,
          h: 3,
          isResizable: false,
          isDraggable: false,
        };
        return [...prev, newItem];
      });
    } else {
      setLayout((prev) =>
        prev
          .filter(({ i }) => i !== name)
          .map((item, index) => ({
            ...item,
            x: index % 2,
            y: Infinity, // put last
          }))
      );
    }
  };
  return (
    <Box>
      <Stack spacing={2}>
        <Button variant="contained" id="render-preload-module" onMouseEnter={handlePreload} onClick={() => handleToggleElement('preLoad')}>
          Hover over this to pre-load module "preLoad#./PreLoadedModule"; Click to show
        </Button>
        <Button variant="contained" id="render-prefetch-module" onMouseEnter={handlePreloadPF} onClick={() => handleToggleElement('preFetch')}>
          Hover over this to pre-load "testApp#./ModuleOne" and prefetch data; Click to show
        </Button>
        <GridLayout margin={[10, 10]} className="layout" layout={layout} cols={2} width={852}>
          <div key="initial">
            <BoxWrapper>
              <ScalprumComponent LoadingComponent={LoadingComponent} scope="testApp" module="./ModuleOne" />
            </BoxWrapper>
          </div>
          {showPreLoadedModule && (
            <div key="preLoad">
              <BoxWrapper>
                <ScalprumComponent LoadingComponent={LoadingComponent} scope="preLoad" module="./PreLoadedModule" />
              </BoxWrapper>
            </div>
          )}
          {showPreLoadedModuleWPF && (
            <div key="preFetch">
              <BoxWrapper>
                <ScalprumComponent LoadingComponent={LoadingComponent} scope="testApp" module="./ModuleOne" />
              </BoxWrapper>
            </div>
          )}
        </GridLayout>
      </Stack>
    </Box>
  );
};

export default LegacyModules;
