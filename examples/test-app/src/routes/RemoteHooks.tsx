import React, { useMemo, useState } from 'react';
import { Grid, Card, CardContent, Typography, Button, Box, Alert } from '@mui/material';
import { useRemoteHook } from '@scalprum/react-core';

interface CounterResult {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  setCount: (value: number) => void;
}

interface ApiResult {
  data: any;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface TimerResult {
  timeLeft: number;
  isRunning: boolean;
  isComplete: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  restart: () => void;
}

const RemoteHooks = () => {
  // Test useRemoteHook with counter hook
  const counterHookArgs = useMemo(() => [{ initialValue: 5, step: 2 }], []);
  const counterHook = useRemoteHook<CounterResult>({
    scope: 'sdk-plugin',
    module: './useCounterHook',
    args: counterHookArgs,
  });

  // Test useRemoteHook with API hook
  const [shouldFail, setShouldFail] = useState(false);
  const apiHookArgs = useMemo(() => [{ delay: 1500, shouldFail, mockData: { message: 'Hello from remote API!' } }], [shouldFail]);
  const apiHook = useRemoteHook<ApiResult>({
    scope: 'sdk-plugin',
    module: './useApiHook',
    args: apiHookArgs,
  });

  // Test useRemoteHook with timer hook
  // Using useMemo to avoid infinite re-renders
  const timerHookArgs = useMemo(() => [{ duration: 5, autoStart: false }], []);
  const timerHook = useRemoteHook<TimerResult>({
    scope: 'sdk-plugin',
    module: './useTimerHook',
    args: timerHookArgs,
  });

  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Remote Hooks Testing
        </Typography>
        <Typography variant="body1" gutterBottom>
          Testing useRemoteHook functionality with various hook types
        </Typography>
      </Grid>

      {/* Counter Hook Test */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Counter Hook
            </Typography>
            {counterHook.loading && <Typography data-testid="counter-loading">Loading counter hook...</Typography>}
            {counterHook.error && (
              <Alert severity="error" data-testid="counter-error">
                Error: {counterHook.error.message}
              </Alert>
            )}
            {counterHook.hookResult && (
              <Box>
                <Typography variant="h4" data-testid="counter-value">
                  {counterHook.hookResult.count}
                </Typography>
                <Box sx={{ mt: 2, gap: 1, display: 'flex', flexWrap: 'wrap' }}>
                  <Button variant="contained" onClick={counterHook.hookResult.increment} data-testid="counter-increment">
                    +2
                  </Button>
                  <Button variant="contained" onClick={counterHook.hookResult.decrement} data-testid="counter-decrement">
                    -2
                  </Button>
                  <Button variant="outlined" onClick={counterHook.hookResult.reset} data-testid="counter-reset">
                    Reset
                  </Button>
                  <Button variant="outlined" onClick={() => counterHook.hookResult?.setCount(100)} data-testid="counter-set-100">
                    Set 100
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* API Hook Test */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              API Hook
            </Typography>
            {apiHook.loading && <Typography data-testid="api-loading">Loading API hook...</Typography>}
            {apiHook.error && (
              <Alert severity="error" data-testid="api-error">
                Error: {apiHook.error.message}
              </Alert>
            )}
            {apiHook.hookResult && (
              <Box>
                {apiHook.hookResult.loading && <Typography data-testid="api-data-loading">Loading data...</Typography>}
                {apiHook.hookResult.error && (
                  <Alert severity="error" data-testid="api-data-error">
                    {apiHook.hookResult.error}
                  </Alert>
                )}
                {apiHook.hookResult.data && <Typography data-testid="api-data">{JSON.stringify(apiHook.hookResult.data)}</Typography>}
                <Box sx={{ mt: 2, gap: 1, display: 'flex', flexWrap: 'wrap' }}>
                  <Button variant="contained" onClick={apiHook.hookResult.refetch} data-testid="api-refetch">
                    Refetch
                  </Button>
                  <Button variant="outlined" onClick={() => setShouldFail(!shouldFail)} data-testid="api-toggle-fail">
                    {shouldFail ? 'Make Succeed' : 'Make Fail'}
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Timer Hook Test */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Timer Hook
            </Typography>
            {timerHook.loading && <Typography data-testid="timer-loading">Loading timer hook...</Typography>}
            {timerHook.error && (
              <Alert severity="error" data-testid="timer-error">
                Error: {timerHook.error.message}
              </Alert>
            )}
            {timerHook.hookResult && (
              <Box>
                <Typography variant="h4" data-testid="timer-value">
                  {timerHook.hookResult.timeLeft}s
                </Typography>
                <Typography data-testid="timer-status">
                  Status: {timerHook.hookResult.isRunning ? 'Running' : 'Stopped'}
                  {timerHook.hookResult.isComplete && ' (Complete)'}
                </Typography>
                <Box sx={{ mt: 2, gap: 1, display: 'flex', flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    onClick={timerHook.hookResult.start}
                    disabled={timerHook.hookResult.isRunning || timerHook.hookResult.isComplete}
                    data-testid="timer-start"
                  >
                    Start
                  </Button>
                  <Button
                    variant="contained"
                    onClick={timerHook.hookResult.pause}
                    disabled={!timerHook.hookResult.isRunning}
                    data-testid="timer-pause"
                  >
                    Pause
                  </Button>
                  <Button variant="outlined" onClick={timerHook.hookResult.reset} data-testid="timer-reset">
                    Reset
                  </Button>
                  <Button variant="outlined" onClick={timerHook.hookResult.restart} data-testid="timer-restart">
                    Restart
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Debug Info */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Debug Information
            </Typography>
            <Typography variant="body2" component="pre" data-testid="debug-info">
              {JSON.stringify(
                {
                  counter: {
                    id: counterHook.id,
                    loading: counterHook.loading,
                    hasError: !!counterHook.error,
                    hasResult: !!counterHook.hookResult,
                  },
                  api: {
                    id: apiHook.id,
                    loading: apiHook.loading,
                    hasError: !!apiHook.error,
                    hasResult: !!apiHook.hookResult,
                  },
                  timer: {
                    id: timerHook.id,
                    loading: timerHook.loading,
                    hasError: !!timerHook.error,
                    hasResult: !!timerHook.hookResult,
                  },
                },
                null,
                2,
              )}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default RemoteHooks;
