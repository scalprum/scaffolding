import { useContext, useEffect, useReducer, useState, useRef } from 'react';
import { getModule, RemoteModuleArgs, RemoteModuleResult } from '@scalprum/core';
import { RemoteHookContext } from './remote-hook-provider';
import { UseRemoteHookResult } from './remote-hooks-types';
export type DynamicHookResult<S extends string, M extends string, I extends string | undefined = undefined> = RemoteModuleResult<S, M, I>;

export type DynamicHookArgs<S extends string, M extends string, I extends string | undefined = undefined> = RemoteModuleArgs<S, M, I>;

export type TypedRemoteHookOptions<S extends string, M extends string, I extends string | undefined = undefined> = {
  scope: S;
  module: M;
  importName?: I;
  args?: DynamicHookArgs<S, M, I>;
};

export function useRemoteHook<S extends string, M extends string, I extends string | undefined = undefined>(
  options: TypedRemoteHookOptions<S, M, I>,
): UseRemoteHookResult<DynamicHookResult<S, M, I>>;
export function useRemoteHook<T = unknown, S extends string = string, M extends string = string, I extends string | undefined = undefined>(
  options: TypedRemoteHookOptions<S, M, I>,
): UseRemoteHookResult<T>;
export function useRemoteHook<T = unknown, S extends string = string, M extends string = string, I extends string | undefined = undefined>({
  scope,
  module,
  importName,
  args = [] as unknown as DynamicHookArgs<S, M, I>,
}: TypedRemoteHookOptions<S, M, I>): UseRemoteHookResult<T> {
  const { subscribe, updateState, getState, registerHook, updateArgs } = useContext(RemoteHookContext);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [id, setId] = useState<string>('');

  useEffect(() => {
    const { id, unsubscribe } = subscribe(forceUpdate);
    setId(id);

    // Track if component is still mounted
    let isMounted = true;

    // Load the federated hook module
    const loadHook = async () => {
      try {
        const hookFunction = await getModule<(...args: any[]) => any>(scope, module, importName);

        // Only update if component is still mounted
        if (isMounted) {
          updateArgs(id, args); // Set args before registering hook
          registerHook(id, hookFunction);
        }
      } catch (error) {
        if (isMounted) {
          updateState(id, { loading: false, error });
        }
      }
    };

    // Set initial loading state
    updateState(id, { loading: true, error: null });
    loadHook();

    return () => {
      isMounted = false; // Mark as unmounted
      unsubscribe();
    };
  }, [scope, module, importName]);

  // Update args when they change (with shallow comparison)
  const argsRef = useRef(args);
  useEffect(() => {
    if (id) {
      const prevArgs = argsRef.current;
      const hasChanged = args.length !== prevArgs.length || args.some((arg, index) => arg !== prevArgs[index]);

      if (hasChanged) {
        argsRef.current = args;
        updateArgs(id, args);
      }
    }
  }, [id, args, updateArgs]);

  const state = getState(id) || { loading: true, error: null };

  return {
    id,
    loading: state.loading,
    error: state.error,
    hookResult: state.hookResult,
  };
}
