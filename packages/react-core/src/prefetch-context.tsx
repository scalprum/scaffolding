import React from 'react';
import { createContext } from 'react';

export interface PrefetchState {
  data: any;
  ready: boolean;
  error?: string;
}

export const PrefetchContext = createContext<Promise<any> | undefined>(undefined);

export const PrefetchProvider: React.FC<React.PropsWithChildren<{ prefetchPromise: Promise<any> | undefined }>> = ({ children, prefetchPromise }) => {
  return <PrefetchContext.Provider value={prefetchPromise}>{children}</PrefetchContext.Provider>;
};
