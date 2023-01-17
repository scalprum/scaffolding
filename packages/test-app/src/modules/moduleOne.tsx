import React from 'react';
import { usePrefetch } from '@scalprum/react-core';

type Prefetch<T = any, A extends Record<string, any> = Record<string, any>> = (scalprumApi: A) => Promise<T>;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.prefetchCounter = 0;

export const prefetch: Prefetch = (scalprumApi) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.prefetchCounter += 1;
  return new Promise((res, rej) => {
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (window.prefetchError === true) {
        return rej('Expected error');
      }
      return res('Hello');
    }, 500);
  });
};

const ModuleOne = () => {
  const { data, ready, error } = usePrefetch();
  return (
    <div>
      <h2>Module one remote component</h2>
      {!ready && <p>Loading...</p>}
      {ready && data ? <p id="success">{data}</p> : null}
      {error ? <p id="error">{error}</p> : null}
    </div>
  );
};

export default ModuleOne;
