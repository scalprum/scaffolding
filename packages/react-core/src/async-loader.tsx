import React from 'react';
import { asyncLoader } from '@scalprum/core';
import DefaultErrorComponent from './default-error-component';

export function loadComponent(scope: string, module: string, ErrorComponent: React.ComponentType<any> = DefaultErrorComponent) {
  return async (): Promise<{ default: React.ComponentType<any> }> => {
    let Module;
    try {
      Module = await asyncLoader(scope, module);
    } catch (e: any) {
      console.error(e, ErrorComponent);
      Module = {
        default: (props: Record<string, any>) => <ErrorComponent {...props} error={e} />,
      };
    }

    return Module;
  };
}
