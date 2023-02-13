import React from 'react';
import { usePrefetch } from '@scalprum/react-core';
import { Box, Button, Card, CardActions, CardContent, CardMedia, Stack, Typography } from '@mui/material';

type Prefetch<T = any, A extends Record<string, any> = Record<string, any>> = (scalprumApi: A) => Promise<T>;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.prefetchCounter = 0;

export const prefetch: Prefetch = (_scalprumApi) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.prefetchCounter += 1;
  return new Promise((res, rej) => {
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (window.prefetchError === true) {
        return rej('Expected error');
      }
      return res('Hello');
    }, 500);
  });
};

const ModuleOne = () => {
  const { data, ready, error } = usePrefetch();
  return (
    <Card sx={{ maxWidth: 345 }}>
      <CardMedia
        sx={{ height: 140 }}
        image="https://media.istockphoto.com/id/177443701/es/foto/drag%C3%B3n-de-agua.jpg?s=1024x1024&w=is&k=20&c=xLfvBTw7DPeiUnqnKSaBTorqJGEXHbPeDsb5al1CnfI="
        title="green iguana"
      />
      <CardContent>
        <Typography gutterBottom variant="h6" component="h2">
          Module one remote component
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Lizards are a widespread group of squamate reptiles, with over 6,000 species, ranging across all continents except Antarctica
        </Typography>
        <Box>
          <Stack>
            {!ready && <Typography>Loading...</Typography>}
            {ready && data ? <Typography id="success">{data}</Typography> : null}
            {error ? <Typography id="error">{error}</Typography> : null}
          </Stack>
        </Box>
      </CardContent>
      <CardActions>
        <Button size="small">Share</Button>
        <Button size="small">Learn More</Button>
      </CardActions>
    </Card>
  );
};

export default ModuleOne;
