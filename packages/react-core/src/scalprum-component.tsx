import React, { Fragment, useEffect, Suspense, useState } from 'react';
import { getApp, getAppData, injectScript, processManifest } from '@scalprum/core';
import { loadComponent } from './async-loader';

export interface ScalprumComponentProps<T = Record<string, unknown>> {
  fallback?: string;
  appName: string;
  api?: T;
  scope: string;
  module: string;
  ErrorComponent?: React.ComponentType;
  processor?: (item: any) => string;
}

export const ScalprumComponent: React.ComponentType<ScalprumComponentProps> = ({
  fallback = 'loading',
  appName,
  api,
  scope,
  module,
  ErrorComponent,
  processor,
  ...props
}) => {
  const { scriptLocation, manifestLocation } = getAppData(appName);
  const [Component, setComponent] = useState<React.ComponentType<any>>(Fragment);
  const [mountedAt, setMountedAt] = useState<HTMLScriptElement | HTMLScriptElement[] | undefined>();
  useEffect(() => {
    const app = getApp(appName);

    if (!app) {
      if (scriptLocation) {
        injectScript(appName, scriptLocation).then(([, scriptMountedAt]) => {
          const app = getApp(appName);
          app?.mount<JSX.Element>(api);
          setComponent(() => React.lazy(loadComponent(scope, module, ErrorComponent)));
          setMountedAt(() => scriptMountedAt);
        });
      } else if (manifestLocation) {
        processManifest(manifestLocation, appName, scope, processor).then((items) => {
          setMountedAt(() => items.map((value) => (value as [unknown, HTMLScriptElement])[1]));
          const app = getApp(appName);
          app?.mount<JSX.Element>(api);
          setComponent(() => React.lazy(loadComponent(scope, module, ErrorComponent)));
        });
      }
    } else {
      app?.mount<JSX.Element>(api);
      setComponent(() => React.lazy(loadComponent(scope, module, ErrorComponent)));
    }
    return () => {
      const app = getApp(appName);
      app?.unmount();
      if (mountedAt) {
        Array.isArray(mountedAt) ? mountedAt.forEach((mounted) => document.body.removeChild(mounted)) : document.body.removeChild(mountedAt);
      }
    };
  }, []);

  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};
