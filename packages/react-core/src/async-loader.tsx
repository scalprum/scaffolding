export interface Container extends Window {
  init: (module: any) => void;
}

declare function __webpack_init_sharing__(scope: string): void;
declare let __webpack_share_scopes__: any;

export function loadComponent(scope: string, module: string) {
  return async (): Promise<{ default: React.ComponentType<any> }> => {
    await __webpack_init_sharing__('default');
    const container: Container = (window as { [key: string]: any })[scope];
    await container.init(__webpack_share_scopes__.default);
    const factory = await (window as { [key: string]: any })[scope].get(module);
    const Module: { default: React.ComponentType<any> } = factory();
    return Module;
  };
}
