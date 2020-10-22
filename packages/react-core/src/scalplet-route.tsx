import { getApp, getAppsByRootLocation, injectScript } from '@scalprum/core';
import React, { Fragment, useEffect } from 'react';
import { Route, RouteProps } from 'react-router-dom';

export interface ScalpletRouteProps extends RouteProps {
  Placeholder?: React.ComponentType;
  appName: string;
  elementId: string;
}
export const ScalpletRoute: React.ComponentType<ScalpletRouteProps> = ({ Placeholder = Fragment, elementId, appName, path, ...props }) => {
  const { scriptLocation } = getAppsByRootLocation(path as string)?.[0];
  useEffect(() => {
    const app = getApp(appName);

    if (!app) {
      injectScript(appName, scriptLocation).then((...args) => {
        const app = getApp(appName);
        console.log(args);
        app.mount();
      });
    } else {
      app.mount();
    }
    return () => {
      const app = getApp(appName);
      if (app) {
        app.unmount();
      }
    };
  }, [path]);

  return (
    <Route {...props} path={path}>
      <div id={elementId}>
        <Placeholder />
      </div>
    </Route>
  );
};
