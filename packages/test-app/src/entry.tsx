import React from 'react';
import { ScalprumProvider } from '@scalprum/react-core';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import RuntimeErrorRoute from './routes/RuntimeErrorRoute';
import LegacyModules from './routes/LegacyModules';
import RootLayout from './layouts/RootLayout';
import RootRoute from './routes/RootRoute';
import SDKModules from './routes/SDKModules';
import NotFoundError from './routes/NotFoundError';

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
        notFound: {
          name: 'notFound',
          manifestLocation: '/testPath/foo/bar/nonsense.json',
        },
        testApp: {
          name: 'testApp',
          manifestLocation: '/testPath/test-app-fed-mods.json',
        },
        testModule: {
          name: 'testModule',
          manifestLocation: '/testPath/test-module-fed-mods.json',
        },
        preLoad: {
          name: 'preLoad',
          manifestLocation: '/testPath/pre-load-module-fed-mods.json',
        },
        'sdk-plugin': {
          name: 'sdk-plugin',
          manifestLocation: '/testPath/plugin-manifest.json',
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<RootRoute />} />
            <Route path="/runtime-error" element={<RuntimeErrorRoute />} />
            <Route path="/not-found-error" element={<NotFoundError />} />
            <Route path="/legacy" element={<LegacyModules />} />
            <Route path="/sdk" element={<SDKModules />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ScalprumProvider>
  );
};

export default Entry;
