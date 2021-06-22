import { useContext } from 'react';
import { ScalprumContext } from './scalprum-context';
import { ScalprumState } from './scalprum-provider';

export function useScalprum<T = ScalprumState<Record<string, unknown>>>(selector?: (state: ScalprumState) => T): T {
  const state = useContext(ScalprumContext);
  if (typeof selector === 'function') {
    return selector(state);
  }

  return (state as unknown) as T;
}
