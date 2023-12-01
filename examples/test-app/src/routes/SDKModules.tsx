import React from 'react';
import { ScalprumComponent } from '@scalprum/react-core';
import { Grid } from '@mui/material';

const SDKModules = () => {
  return (
    <Grid container spacing={4}>
      <Grid xs={12} md={6} item>
        <ScalprumComponent scope="sdk-plugin" module="./SDKComponent" />;
      </Grid>
      <Grid xs={12} md={6} item>
        <ScalprumComponent scope="sdk-plugin" module="./SDKComponent" importName="NamedSDKComponent" />
      </Grid>
    </Grid>
  );
};

export default SDKModules;
