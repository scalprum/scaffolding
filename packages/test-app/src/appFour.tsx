import { initializeApp } from '@scalprum/core';
import { History } from 'history';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const { Fragment, lazy, Suspense, useEffect, default: React } = window.React;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const { Route, Link, BrowserRouter, useHistory } = window.ReactRouterDOM;

const AppOneLazyLoaded = lazy(() => import('./app-one-lazy-loaded'));
console.log({ AppOneLazyLoaded });

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
  },
  update: console.log,
  mount: ({ appsMetaData: { appFour }, history }) => {
    return (
      <BrowserRouter basename={appFour.rootLocation}>
        <AppFour history={history} basename={appFour.rootLocation} />
      </BrowserRouter>
    );
  },
});
