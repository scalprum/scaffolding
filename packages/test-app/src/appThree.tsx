import React, { lazy, Suspense } from 'react';
import { Router, Route, Link } from 'react-router-dom';
import { initializeApp } from '@scalprum/core';
import { History } from 'history';

const AppOneLazyLoaded = lazy(() => import('./app-one-lazy-loaded'));

/**
 * Nested routing with shared scaffolding history.
 * You have to prefix all routes
 */
const AppThree: React.ComponentType<{ basename: string; history: History }> = ({ basename, history }) => {
  return (
    <Router history={history}>
      <ul>
        <li>
          <Link to={`${basename}`}>App three top</Link>
        </li>
        <li>
          <Link to={`${basename}/nested`}>App three nested route</Link>
        </li>
        <li>
          <Link to={`${basename}/nested-lazy`}>App three nested lazy route</Link>
        </li>
      </ul>
      <div>
        <Route path={basename}>
          <h1>This is application three</h1>
        </Route>
        <Route exact path={`${basename}/nested`}>
          <h2>App three nested route</h2>
        </Route>
        <Route exact path={`${basename}/nested-lazy`}>
          <Suspense fallback={<div>Loading</div>}>
            <AppOneLazyLoaded />
          </Suspense>
        </Route>
      </div>
    </Router>
  );
};

initializeApp<{ history: History }>({
  id: 'app-three',
  name: 'appThree',
  unmount: () => {
    console.log('unmounting app three');
  },
  update: console.log,
  mount: ({ appsMetaData: { appThree }, history }) => {
    return <AppThree history={history} basename={appThree.rootLocation!} />;
  },
});
