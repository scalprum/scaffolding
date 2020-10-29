import { getApp, getAppsByRootLocation, injectScript } from '@scalprum/core';
import React, { Fragment, useEffect } from 'react';
import { Route, RouteProps } from 'react-router-dom';

export interface ScalprumRouteProps extends RouteProps {
  Placeholder?: React.ComponentType;
  appName: string;
  elementId: string;
  path: string;
}
export const ScalprumRoute: React.ComponentType<ScalprumRouteProps> = ({ Placeholder = Fragment, elementId, appName, path, ...props }) => {
  const { scriptLocation } = getAppsByRootLocation(path as string)?.[0];
  useEffect(() => {
    const app = getApp(appName);

    if (!app) {
      injectScript(appName, scriptLocation).then(() => {
        const app = getApp(appName);
        app.mount();
      });
    } else {
      app.mount();
    }
  }, [path]);

  return (
    <Route {...props} path={path}>
      <div id={elementId}>
        <Placeholder />
      </div>
    </Route>
  );
};
