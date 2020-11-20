import React, { Fragment, useEffect, Suspense, useState } from 'react';
import { getApp, getAppsByRootLocation, injectScript } from '@scalprum/core';
import { loadComponent } from './async-loader';

export interface ScalprumComponentProps<T = Record<string, unknown>> {
  fallback?: string;
  appName: string;
  path: string;
  api?: T;
  scope: string;
  module: string;
}

export const ScalprumComponent: React.ComponentType<ScalprumComponentProps> = ({
  fallback = 'loading',
  appName,
  path,
  api,
  scope,
  module,
  ...props
}) => {
  const { scriptLocation } = getAppsByRootLocation(path as string)?.[0];
  const [Component, setComponent] = useState<React.ComponentType<any>>(Fragment);
  const [mountedAt, setMountedAt] = useState<HTMLScriptElement | undefined>();
  useEffect(() => {
    const app = getApp(appName);

    if (!app) {
      injectScript(appName, scriptLocation).then(([, scriptMountedAt]) => {
        const app = getApp(appName);
        app?.mount<JSX.Element>(api);
        setComponent(() => React.lazy(loadComponent(scope, module)));
        setMountedAt(() => scriptMountedAt);
      });
    } else {
      app?.mount<JSX.Element>(api);
      setComponent(() => React.lazy(loadComponent(scope, module)));
    }
    return () => {
      const app = getApp(appName);
      app?.unmount();
      mountedAt && document.body.removeChild(mountedAt);
    };
  }, [path]);

  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};
