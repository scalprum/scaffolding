import { Typography } from '@mui/material';
import { Container } from '@mui/system';
import React from 'react';

const RootRoute = () => {
  return (
    <Container disableGutters maxWidth="sm" component="main" sx={{ pt: 8, pb: 6 }}>
      <Typography component="h1" variant="h2" align="center" color="text.primary" gutterBottom>
        Scalprum testing page
      </Typography>
      <Typography variant="h5" align="center" color="text.secondary" component="p">
        Select pages for different test cases.
      </Typography>
    </Container>
  );
};

export default RootRoute;
