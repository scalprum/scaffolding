import { Box, Typography } from '@mui/material';
import { ScalprumComponent } from '@scalprum/react-core';

const ApiUpdates = () => {
  return (
    <Box>
      <Typography variant="h4">API Updates</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          <ScalprumComponent module="./ApiModule" scope="sdk-plugin" importName="ApiConsumer" />
        </Box>
        <Box>
          <ScalprumComponent module="./ApiModule" scope="sdk-plugin" importName="ApiChanger" />
        </Box>
      </Box>
    </Box>
  );
};

export default ApiUpdates;
