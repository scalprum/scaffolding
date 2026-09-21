import { ScalprumComponent, useRemoteHook } from '@scalprum/react-core';
import { Box, Typography } from '@mui/material';

export const TypedRemoteTypes = () => {
  const counter = useRemoteHook({
    scope: 'sdk-plugin',
    module: './useCounterHook',
    args: [{ initialValue: 5, step: 2 }],
  });

  return (
    <Box>
      <Typography>Inferred counter: {counter.hookResult?.count ?? 'loading'}</Typography>
      <ScalprumComponent scope="sdk-plugin" module="./SDKComponent" importName="PluginSDKComponent" name="Remote component" />
    </Box>
  );
};
