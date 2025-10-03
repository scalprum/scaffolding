import { useState, useEffect, useRef } from 'react';

export interface UseTimerOptions {
  duration?: number; // in seconds
  autoStart?: boolean;
  onComplete?: () => void;
}

export interface UseTimerResult {
  timeLeft: number;
  isRunning: boolean;
  isComplete: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  restart: () => void;
}

/**
 * Remote hook that provides timer functionality
 * This will be loaded and executed remotely via useRemoteHook
 */
export const useTimerHook = (options: UseTimerOptions = {}): UseTimerResult => {
  const { duration = 10, autoStart = false, onComplete } = options;

  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isComplete = timeLeft === 0;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, onComplete]);

  const start = () => {
    if (timeLeft > 0) {
      setIsRunning(true);
    }
  };

  const pause = () => {
    setIsRunning(false);
  };

  const reset = () => {
    setIsRunning(false);
    setTimeLeft(duration);
  };

  const restart = () => {
    setTimeLeft(duration);
    setIsRunning(true);
  };

  return {
    timeLeft,
    isRunning,
    isComplete,
    start,
    pause,
    reset,
    restart,
  };
};

export default useTimerHook;