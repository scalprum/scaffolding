import { useEffect } from 'react';
import { useContext, useState } from 'react';
import { PrefetchState, PrefetchContext } from './prefetch-context';

const defaultState = {
  data: undefined,
  ready: false,
  error: undefined,
};

export const usePrefetch = (): PrefetchState => {
  const [currState, setCurrState] = useState<PrefetchState>(defaultState);
  const promise = useContext(PrefetchContext);

  useEffect(() => {
    currState.ready = false;
    promise
      ?.then((res) => {
        setCurrState({ ...currState, error: undefined, data: res, ready: true });
      })
      .catch((e) => {
        setCurrState({ ...currState, ready: true, data: undefined, error: e });
      });
  }, [promise]);
  return currState;
};
