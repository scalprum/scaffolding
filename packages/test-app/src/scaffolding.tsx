import React, { useEffect } from 'react';
import * as ReactDOM from 'react-dom';
import { AppsConfig } from '@scalprum/core';
import { useScalprum, ScalpletRoute } from '@scalprum/react-core';
import { BrowserRouter, Link, Route, Switch } from 'react-router-dom';

window.React = React;
window.ReactDOM = ReactDOM;

const config: AppsConfig = {
  appOne: {
    appId: 'app-one',
    elementId: 'app-one-root',
    name: 'appOne',
    rootLocation: '/app-one',
    scriptLocation: '/appOne.js',
  },
  appTwo: {
    appId: 'app-two',
    elementId: 'app-two-root',
    name: 'appTwo',
    rootLocation: '/app-two',
    scriptLocation: '/appTwo.js',
  },
};

const App = () => {
  const scalprum = useScalprum(config);
  useEffect(() => {
    console.log(scalprum);
  });
  return (
    <div>
      <h1>There will be dragons</h1>
      <BrowserRouter>
        <div>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            {Object.values(scalprum.config).map(({ appId, rootLocation }) => (
              <li key={appId}>
                <Link to={rootLocation}>{appId}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Switch>
            {Object.values(scalprum.config).map(({ name, rootLocation, ...item }) => (
              <ScalpletRoute key={rootLocation} {...item} appName={name} path={rootLocation} />
            ))}
            <Route>
              <h1>Home</h1>
            </Route>
          </Switch>
        </div>
      </BrowserRouter>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
