import { useEffect, useState } from 'react';
import { ScalprumComponent } from '@scalprum/react-core';
import { Grid, Typography } from '@mui/material';

const SDKModules = () => {
  const [delayed, setDelayed] = useState(false);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDelayed(true);
    }, 5000);
    const interval = setInterval(() => {
      if (seconds >= 6) {
        clearInterval(interval);
        return;
      }
      setSeconds((prevSeconds) => prevSeconds + 1);
    }, 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);
  const props = {
    name: 'plugin-manifest',
  };
  return (
    <Grid container spacing={4}>
      <Grid xs={12} md={6} item>
        <ScalprumComponent scope="sdk-plugin" module="./SDKComponent" />
      </Grid>
      <Grid xs={12} md={6} item>
        <ScalprumComponent scope="sdk-plugin" module="./SDKComponent" importName="NamedSDKComponent" />
      </Grid>
      <Grid xs={12} md={6} item>
        <ScalprumComponent scope="full-manifest" module="./SDKComponent" importName="PluginSDKComponent" {...props} />
      </Grid>

      <Grid xs={12} md={6} item>
        {delayed ? (
          <ScalprumComponent scope="sdk-plugin" module="./DelayedModule" />
        ) : (
          <Typography>Loading delayed module in {5 - seconds} seconds</Typography>
        )}
      </Grid>
    </Grid>
  );
};

export default SDKModules;
