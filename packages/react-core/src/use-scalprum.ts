import { useContext } from 'react';
import { ScalprumContext, ScalprumState } from './scalprum-context';

export function useScalprum<T = ScalprumState<Record<string, any>>>(selector?: (state: ScalprumState) => T): T {
  const state = useContext(ScalprumContext);
  if (typeof selector === 'function') {
    return selector(state);
  }

  return state as unknown as T;
}
