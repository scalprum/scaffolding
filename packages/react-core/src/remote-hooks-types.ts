// Shared types for remote hooks functionality
export interface HookConfig {
  scope: string;
  module: string;
  importName?: string;
  args?: any[];
}

export interface UseRemoteHookResult<T> {
  id: string;
  loading: boolean;
  error: Error | null;
  hookResult?: T;
}

export interface RemoteHookHandle<T = any> {
  readonly loading: boolean;
  readonly error: Error | null;
  readonly hookResult?: T;
  readonly id: string;

  updateArgs(args: any[]): void;
  remove(): void;
  subscribe(callback: (result: UseRemoteHookResult<T>) => void): () => void;
}

export interface HookHandle {
  remove(): void;
  updateArgs(args: any[]): void;
}

export interface RemoteHookManager {
  addHook(config: HookConfig): HookHandle; // Returns handle with remove and updateArgs
  cleanup(): void; // Cleanup for component unmount
  getHookResults(): UseRemoteHookResult<any>[]; // Get results for all tracked hooks
}

// Context type from RemoteHookProvider
export interface RemoteHookContextType {
  subscribe: (notify: () => void) => { id: string; unsubscribe: () => void };
  updateState: (id: string, value: any) => void;
  getState: (id: string) => any;
  registerHook: (id: string, hookFunction: (...args: any[]) => any) => void;
  updateArgs: (id: string, args: any[]) => void;
  subscribeToArgs: (id: string, callback: (args: any[]) => void) => () => void;
}
