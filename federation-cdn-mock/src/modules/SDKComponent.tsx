import React from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Slider from '@mui/material/Slider';
import Checkbox from '@mui/material/Checkbox';
import InboxIcon from '@mui/icons-material/Inbox';
import DraftsIcon from '@mui/icons-material/Drafts';

interface namedProps {
  name: string;
}

function valuetext(value: number) {
  return `${value}°C`;
}

export const NamedSDKComponent = () => {
  return (
    <Box sx={{ width: 300 }}>
      <Slider id="named-component" aria-label="Temperature" defaultValue={30} getAriaValueText={valuetext} color="secondary" />
    </Box>
  );
};

export const PluginSDKComponent = (props: namedProps = { name: 'named' }) => {
  return (
    <Box sx={{ width: 300 }}>
      <Checkbox aria-label="Checked" id={props.name} defaultChecked />
    </Box>
  );
};

const SDKComponent = () => {
  return (
    <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
      Hola
      <nav aria-label="main mailbox folders">
        <List>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <InboxIcon />
              </ListItemIcon>
              <ListItemText id="sdk-module-item" primary="SDK Inbox" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <DraftsIcon />
              </ListItemIcon>
              <ListItemText primary="Drafts" />
            </ListItemButton>
          </ListItem>
        </List>
      </nav>
      <Divider />
      <nav aria-label="secondary mailbox folders">
        <List>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemText primary="Trash" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component="a" href="#simple-list">
              <ListItemText primary="Spam" />
            </ListItemButton>
          </ListItem>
        </List>
      </nav>
    </Box>
  );
};

export default SDKComponent;
