import { createContext } from 'react';
import { ScalprumState } from './scalprum-provider';

export const ScalprumContext = createContext<ScalprumState>({
  initialized: false,
  config: {},
  api: {},
});
