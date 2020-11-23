import { getApp, getAppsByRootLocation, injectScript } from '@scalprum/core';
import React, { Fragment, useEffect } from 'react';
import { unmountComponentAtNode, render } from 'react-dom';
import { Route, RouteProps } from 'react-router-dom';

export interface ScalprumRouteProps<T = Record<string, unknown>> extends RouteProps {
  Placeholder?: React.ComponentType;
  appName: string;
  elementId: string;
  path: string;
  api?: T;
}
export const ScalprumRoute: React.ComponentType<ScalprumRouteProps> = ({ Placeholder = Fragment, elementId, appName, path, api, ...props }) => {
  const { scriptLocation } = getAppsByRootLocation(path as string)?.[0];
  useEffect(() => {
    const app = getApp(appName);
    const element = document.getElementById(elementId);

    if (!app) {
      injectScript(appName, scriptLocation as string).then(() => {
        const app = getApp(appName);
        const node = app.mount<JSX.Element>(api);
        render(node, element);
      });
    } else {
      const node = app.mount<JSX.Element>(api);
      render(node, element);
    }
    return () => {
      const app = getApp(appName);
      app.unmount();
      unmountComponentAtNode(element!);
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
