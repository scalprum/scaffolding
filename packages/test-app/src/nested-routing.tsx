import { unmountAll } from '@scalprum/core';
import { ScalprumLink, ScalprumRoute, ScalprumState } from '@scalprum/react-core';
import React from 'react';
import { Route, Switch } from 'react-router-dom';

const NestedRouting: React.ComponentType<{ scalprum: ScalprumState; routePrefix: string }> = ({ scalprum, routePrefix }) => {
  return (
    <div>
      <h1>Nested routing</h1>
      <ul>
        <li>
          <ScalprumLink shouldUnmount unmount={() => unmountAll()} to={routePrefix}>
            Nested routing home
          </ScalprumLink>
        </li>
        <li>
          <ScalprumLink
            shouldUnmount={(pathname) => !pathname.includes('/app-three')}
            unmount={() => unmountAll()}
            to={`${routePrefix}/app-three/nested`}
          >
            App three nested link from scaffolding
          </ScalprumLink>
        </li>
        <li>
          <ScalprumLink
            shouldUnmount={(pathname) => !pathname.includes('/app-four')}
            unmount={() => unmountAll()}
            to={`${routePrefix}/app-four/nested`}
          >
            App four nested link from scaffolding
          </ScalprumLink>
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

export default NestedRouting;
