import React from 'react';
import { asyncLoader } from '@scalprum/core';

const DefaultErrorComponent: React.ComponentType<any> = () => {
  return <span>Error while loading component!</span>;
};

export function loadComponent(scope: string, module: string, ErrorComponent: React.ComponentType<any> = DefaultErrorComponent) {
  return async (): Promise<{ default: React.ComponentType<any> }> => {
    let Module;
    try {
      Module = await asyncLoader(scope, module);
    } catch (e) {
      console.error(e);
      Module = {
        default: ErrorComponent,
      };
    }

    return Module;
  };
}
