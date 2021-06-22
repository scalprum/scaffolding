import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactRouterDOM from 'react-router-dom';
import { createBrowserHistory, History } from 'history';
import { AppsConfig, unmountAll } from '@scalprum/core';
import { useScalprum, ScalprumProvider, ScalprumLink, ScalprumState } from '@scalprum/react-core';

import NestedRouting from './nested-routing';
import BasicRouting from './basic-routing';

const { Router, Route, Switch } = ReactRouterDOM;

window.React = React;
window.ReactDOM = ReactDOM;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ReactRouterDOM = ReactRouterDOM;

const BASIC_ROUTING = '/basic-routing';
const NESTED_ROUTING = '/nested-routing';

const config: AppsConfig = {
  appOne: {
    appId: 'app-one',
    elementId: 'app-one-root',
    name: 'appOne',
    rootLocation: `${BASIC_ROUTING}/app-one`,
    scriptLocation: '/appOne.js',
  },
  appTwo: {
    appId: 'app-two',
    elementId: 'app-two-root',
    name: 'appTwo',
    rootLocation: `${BASIC_ROUTING}/app-two`,
    scriptLocation: '/appTwo.js',
  },
  appThree: {
    appId: 'app-three',
    elementId: 'app-three-root',
    name: 'appThree',
    rootLocation: `${NESTED_ROUTING}/app-three`,
    scriptLocation: '/appThree.js',
  },
  appFour: {
    appId: 'app-four',
    elementId: 'app-four-root',
    name: 'appFour',
    rootLocation: `${NESTED_ROUTING}/app-four`,
    scriptLocation: '/appFour.js',
  },
};

const history = createBrowserHistory();

const App = () => {
  const scalprum = useScalprum<{ history: History }>();
  return (
    <div>
      <Router history={history}>
        <div>
          <h1>Scafolding routes</h1>
          <ul>
            <li>
              <ScalprumLink shouldUnmount unmount={() => unmountAll()} to={BASIC_ROUTING}>
                Basic routing
              </ScalprumLink>
            </li>
            <li>
              <ScalprumLink shouldUnmount unmount={() => unmountAll()} to={NESTED_ROUTING}>
                Nested routing
              </ScalprumLink>
            </li>
          </ul>
        </div>
        <div>
          <Switch>
            <Route path="/nested-routing">
              <NestedRouting scalprum={(scalprum as unknown) as ScalprumState<Record<string, unknown>>} routePrefix={NESTED_ROUTING} />
            </Route>
            <Route path="/basic-routing">
              <BasicRouting routePrefix={BASIC_ROUTING} scalprum={(scalprum as unknown) as ScalprumState<Record<string, unknown>>} />
            </Route>
          </Switch>
        </div>
      </Router>
    </div>
  );
};

const Wrapper = () => (
  <ScalprumProvider config={config} api={{ history }}>
    <App />
  </ScalprumProvider>
);

ReactDOM.render(<Wrapper />, document.getElementById('root'));
