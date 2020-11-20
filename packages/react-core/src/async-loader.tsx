import React from 'react';

export interface Container extends Window {
  init: (module: any) => void;
}

declare function __webpack_init_sharing__(scope: string): void;
declare let __webpack_share_scopes__: any;

const DefaultErrorComponent: React.ComponentType<any> = () => {
  return <span>Error while loading component!</span>;
};

export function loadComponent(scope: string, module: string, ErrorComponent: React.ComponentType<any> = DefaultErrorComponent) {
  return async (): Promise<{ default: React.ComponentType<any> }> => {
    let Module;
    try {
      await __webpack_init_sharing__('default');
      const container: Container = (window as { [key: string]: any })[scope];
      await container.init(__webpack_share_scopes__.default);
      const factory = await (window as { [key: string]: any })[scope].get(module);
      Module = factory();
    } catch (e) {
      console.error(e);
      Module = {
        default: ErrorComponent,
      };
    }

    return Module;
  };
}
