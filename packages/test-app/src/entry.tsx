import React from 'react';
import { ScalprumProvider } from '@scalprum/react-core';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import RuntimeErrorRoute from './routes/RuntimeErrorRoute';
import LegacyModules from './routes/LegacyModules';
import RootLayout from './layouts/RootLayout';
import RootRoute from './routes/RootRoute';
import SDKModules from './routes/SDKModules';

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
        'sdk-plugin': {
          name: 'sdk-plugin',
          manifestLocation: '/plugin-manifest.json',
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<RootRoute />} />
            <Route path="/runtime-error" element={<RuntimeErrorRoute />} />
            <Route path="/legacy" element={<LegacyModules />} />
            <Route path="/sdk" element={<SDKModules />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ScalprumProvider>
  );
};

export default Entry;
