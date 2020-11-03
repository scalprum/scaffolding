import { ScalprumLink, ScalprumRoute, ScalprumState } from '@scalprum/react-core';
import React from 'react';
import { Route, Switch } from 'react-router-dom';

const BasicRouting: React.ComponentType<{ scalprum: ScalprumState; routePrefix: string }> = ({ scalprum, routePrefix }) => {
  return (
    <div>
      <h1>Basic routing</h1>
      <ul>
        <li>
          <ScalprumLink to={routePrefix}>Basic routing home</ScalprumLink>
        </li>
        {Object.values(scalprum.config)
          .filter(({ rootLocation }) => rootLocation.includes(routePrefix))
          .map(({ appId, rootLocation }) => (
            <li key={appId}>
              <ScalprumLink to={rootLocation}>{appId}</ScalprumLink>
            </li>
          ))}
      </ul>
      <Switch>
        {Object.values(scalprum.config)
          .filter(({ rootLocation }) => rootLocation.includes(routePrefix))
          .map(({ name, rootLocation, ...item }) => (
            <ScalprumRoute key={rootLocation} {...item} appName={name} path={rootLocation} />
          ))}
        <Route>
          <h1>Home</h1>
        </Route>
      </Switch>
    </div>
  );
};

export default BasicRouting;
