import React from 'react';
import { Grid } from '@mui/material';
import { useModule } from '@scalprum/react-core';

const UseModuleLoading = () => {
  const Component = useModule<React.ComponentType>('sdk-plugin', './SDKComponent');

  return (
    <Grid container spacing={4}>
      <Grid xs={12} md={6} item>
        {Component ? <Component /> : 'Loading...'}
      </Grid>
    </Grid>
  );
};

export default UseModuleLoading;
