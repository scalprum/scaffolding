import React, { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Button, Box, Alert, Chip } from '@mui/material';
import { useRemoteHookManager, UseRemoteHookResult } from '@scalprum/react-core';

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
}

function isCounterResult(result: UseRemoteHookResult<any>): result is UseRemoteHookResult<CounterResult> {
  return result && typeof result.hookResult.count === 'number' && typeof result.hookResult.increment === 'function';
}

function isApiResult(result: any): result is UseRemoteHookResult<ApiResult> {
  return (
    result &&
    'data' in result.hookResult &&
    'loading' in result.hookResult &&
    'error' in result.hookResult &&
    typeof result.hookResult.refetch === 'function'
  );
}

function isTimerResult(result: any): result is UseRemoteHookResult<TimerResult> {
  return result && typeof result.hookResult.timeLeft === 'number' && typeof result.hookResult.start === 'function';
}

const RemoteHookManager = () => {
  const { addHook, cleanup, hookResults } = useRemoteHookManager();
  const [hooks, setHooks] = useState<any[]>([]);

  // Add counter hook
  const addCounterHook = () => {
    const handle = addHook({
      scope: 'sdk-plugin',
      module: './useCounterHook',
      args: [{ initialValue: Math.floor(Math.random() * 10), step: 1 }],
    });

    setHooks((prev) => [...prev, { type: 'counter', handle }]);
  };

  // Add API hook
  const addApiHook = () => {
    const handle = addHook({
      scope: 'sdk-plugin',
      module: './useApiHook',
      args: [
        {
          delay: 1000,
          mockData: {
            id: Date.now(),
            message: `API data ${hooks.length + 1}`,
            timestamp: new Date().toISOString(),
          },
        },
      ],
    });

    setHooks((prev) => [...prev, { type: 'api', handle }]);
  };

  // Add timer hook
  const addTimerHook = () => {
    const handle = addHook({
      scope: 'sdk-plugin',
      module: './useTimerHook',
      args: [{ duration: 10, autoStart: true }],
    });

    setHooks((prev) => [...prev, { type: 'timer', handle }]);
  };

  // Remove hook
  const removeHook = (index: number) => {
    const hook = hooks[index];
    hook.handle.remove();
    setHooks((prev) => prev.filter((_, i) => i !== index));
  };

  // Update hook args
  const updateCounterArgs = (index: number, newValue: number) => {
    const hook = hooks[index];
    if (hook.type === 'counter') {
      hook.handle.updateArgs([{ initialValue: newValue, step: 1 }]);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Remote Hook Manager Testing
        </Typography>
        <Typography variant="body1" gutterBottom>
          Testing useRemoteHookManager functionality with dynamic hook management
        </Typography>
      </Grid>

      {/* Controls */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Hook Management Controls
            </Typography>
            <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
              <Button variant="contained" onClick={addCounterHook} data-testid="add-counter-hook">
                Add Counter Hook
              </Button>
              <Button variant="contained" onClick={addApiHook} data-testid="add-api-hook">
                Add API Hook
              </Button>
              <Button variant="contained" onClick={addTimerHook} data-testid="add-timer-hook">
                Add Timer Hook
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  cleanup();
                  setHooks([]);
                }}
                color="error"
                data-testid="cleanup-all"
              >
                Cleanup All
              </Button>
            </Box>
            <Typography variant="body2" sx={{ mt: 2 }} data-testid="hook-count">
              Active Hooks: {hooks.length}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Hook Results */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Hook Results ({hookResults.length})
        </Typography>
        <Grid container spacing={2}>
          {hookResults.map((result, index) => {
            const hook = hooks[index];
            if (!hook) return null;

            return (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        {hook.type.charAt(0).toUpperCase() + hook.type.slice(1)} #{index + 1}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip label={result.loading ? 'Loading' : 'Loaded'} color={result.loading ? 'warning' : 'success'} size="small" />
                        <Button size="small" onClick={() => removeHook(index)} data-testid={`remove-hook-${index}`}>
                          Remove
                        </Button>
                      </Box>
                    </Box>

                    {result.loading && <Typography data-testid={`hook-loading-${index}`}>Loading...</Typography>}

                    {result.error && (
                      <Alert severity="error" data-testid={`hook-error-${index}`}>
                        {result.error.message}
                      </Alert>
                    )}

                    {result.hookResult ? (
                      <Box>
                        {hook.type === 'counter' && isCounterResult(result) && (
                          <Box>
                            <Typography variant="h4" data-testid={`counter-value-${index}`}>
                              {result.hookResult.count}
                            </Typography>
                            <Box sx={{ mt: 1, gap: 1, display: 'flex', flexWrap: 'wrap' }}>
                              <Button size="small" onClick={result.hookResult.increment} data-testid={`counter-increment-${index}`}>
                                +
                              </Button>
                              <Button size="small" onClick={result.hookResult.decrement} data-testid={`counter-decrement-${index}`}>
                                -
                              </Button>
                              <Button size="small" onClick={() => result.hookResult?.setCount(50)} data-testid={`counter-update-args-${index}`}>
                                Set 50
                              </Button>
                            </Box>
                          </Box>
                        )}

                        {hook.type === 'api' && isApiResult(result) && (
                          <Box>
                            {result.hookResult.loading && <Typography data-testid={`api-loading-${index}`}>Loading data...</Typography>}
                            {result.hookResult.error && (
                              <Alert severity="error" data-testid={`api-error-${index}`}>
                                {result.hookResult.error}
                              </Alert>
                            )}
                            {result.hookResult.data && (
                              <Typography variant="body2" data-testid={`api-data-${index}`}>
                                {result.hookResult.data.message}
                              </Typography>
                            )}
                            <Button size="small" onClick={result.hookResult.refetch} data-testid={`api-refetch-${index}`} sx={{ mt: 1 }}>
                              Refetch
                            </Button>
                          </Box>
                        )}

                        {hook.type === 'timer' && isTimerResult(result) && (
                          <Box>
                            <Typography variant="h4" data-testid={`timer-value-${index}`}>
                              {result.hookResult.timeLeft}s
                            </Typography>
                            <Typography variant="body2" data-testid={`timer-status-${index}`}>
                              {result.hookResult.isRunning ? 'Running' : 'Stopped'}
                              {result.hookResult.isComplete && ' (Complete)'}
                            </Typography>
                            <Box sx={{ mt: 1, gap: 1, display: 'flex', flexWrap: 'wrap' }}>
                              <Button
                                size="small"
                                onClick={result.hookResult.start}
                                disabled={result.hookResult.isRunning}
                                data-testid={`timer-start-${index}`}
                              >
                                Start
                              </Button>
                              <Button
                                size="small"
                                onClick={result.hookResult.pause}
                                disabled={!result.hookResult.isRunning}
                                data-testid={`timer-pause-${index}`}
                              >
                                Pause
                              </Button>
                              <Button size="small" onClick={result.hookResult.reset} data-testid={`timer-reset-${index}`}>
                                Reset
                              </Button>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    ) : null}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Grid>

      {/* Debug Information */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Manager Debug Info
            </Typography>
            <Typography variant="body2" component="pre" data-testid="manager-debug">
              {JSON.stringify(
                {
                  totalHooks: hooks.length,
                  hookTypes: hooks.map((h) => h.type),
                  results: hookResults.map((r, i) => ({
                    index: i,
                    id: r.id,
                    loading: r.loading,
                    hasError: !!r.error,
                    hasResult: !!r.hookResult,
                  })),
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

export default RemoteHookManager;
