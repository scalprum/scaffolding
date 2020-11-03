import React, { Fragment, lazy, Suspense, useEffect } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Route, Link, BrowserRouter, useHistory } from 'react-router-dom';
import { initializeApp } from '@scalprum/core';
import { History } from 'history';

const AppOneLazyLoaded = lazy(() => import('./app-one-lazy-loaded'));

/**
 * Nested routing with isolated history.
 * Outside routing changes must be handled on its own
 */
const AppFour: React.ComponentType<{ history: History; basename: string }> = ({ history, basename }) => {
  const internalHistory = useHistory();
  useEffect(() => {
    const historyUnregister = history.listen(({ pathname }) => {
      console.log({ pathname, internalHistory, includes: pathname.includes(basename) });
      if (pathname.includes(basename) && internalHistory.location.pathname !== pathname) {
        internalHistory.push(pathname.replace(new RegExp(`^${basename}`), ''));
      }
    });
    return () => historyUnregister();
  }, []);
  return (
    <Fragment>
      <ul>
        <li>
          <Link to="/">App four top</Link>
        </li>
        <li>
          <Link to="/nested">App four nested route</Link>
        </li>
        <li>
          <Link to="nested-lazy">App four nested lazy route</Link>
        </li>
      </ul>
      <div>
        <Route path="/">
          <h1>This is application four</h1>
        </Route>
        <Route exact path="/nested">
          <h2>App four nested route</h2>
        </Route>
        <Route exact path="nested-lazy">
          <Suspense fallback={<div>Loading</div>}>
            <AppOneLazyLoaded />
          </Suspense>
        </Route>
      </div>
    </Fragment>
  );
};

initializeApp<{ history: History }>({
  id: 'app-four',
  name: 'appFour',
  unmount: () => {
    console.log('unmounting app four');
    unmountComponentAtNode(document.getElementById('app-four-root')!);
  },
  update: console.log,
  mount: ({ appsMetaData: { appFour }, history }) => {
    return render(
      <BrowserRouter basename={appFour.rootLocation}>
        <AppFour history={history} basename={appFour.rootLocation} />
      </BrowserRouter>,
      document.getElementById('app-four-root')
    );
  },
});
