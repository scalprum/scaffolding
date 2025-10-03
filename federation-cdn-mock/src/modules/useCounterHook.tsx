import { useState, useEffect } from 'react';

export interface UseCounterOptions {
  initialValue?: number;
  step?: number;
}

export interface UseCounterResult {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  setCount: (value: number) => void;
}

/**
 * Remote hook that provides counter functionality
 * This will be loaded and executed remotely via useRemoteHook
 */
export const useCounterHook = (options: UseCounterOptions = {}): UseCounterResult => {
  const {
    initialValue = 0,
    step = 1,
  } = options;

  const [count, setCount] = useState(initialValue);

  const increment = () => setCount(prev => prev + step);
  const decrement = () => setCount(prev => prev - step);
  const reset = () => setCount(initialValue);

  return {
    count,
    increment,
    decrement,
    reset,
    setCount,
  };
};

export default useCounterHook;