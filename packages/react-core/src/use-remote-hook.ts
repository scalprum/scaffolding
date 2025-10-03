import { useContext, useEffect, useReducer, useState, useRef } from 'react';
import { getModule } from '@scalprum/core';
import { RemoteHookContext } from './remote-hook-provider';
import { UseRemoteHookResult } from './remote-hooks-types';

export const useRemoteHook = <T>({
  scope,
  module,
  importName,
  args = [],
}: {
  scope: string;
  module: string;
  importName?: string;
  args?: any[];
}): UseRemoteHookResult<T> => {
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
        const hookFunction = await getModule(scope, module, importName);

        // Only update if component is still mounted
        if (isMounted) {
          updateState(id, { loading: false, error: null });
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
};
