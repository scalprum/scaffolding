import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import GlobalStyles from '@mui/material/GlobalStyles';
import Container from '@mui/material/Container';
import { Link, Outlet } from 'react-router-dom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NavLink = (props: any) => <Button {...props} component={Link} />;

function RootLayout() {
  return (
    <React.Fragment>
      <GlobalStyles styles={{ ul: { margin: 0, padding: 0, listStyle: 'none' } }} />
      <CssBaseline />
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
        <Toolbar sx={{ flexWrap: 'wrap' }}>
          <Typography variant="h6" color="inherit" noWrap sx={{ flexGrow: 1 }}>
            Home
          </Typography>
          <nav>
            <NavLink variant="button" color="text.primary" to="/" sx={{ my: 1, mx: 1.5 }}>
              Home
            </NavLink>
            <NavLink variant="button" color="text.primary" to="/legacy" sx={{ my: 1, mx: 1.5 }}>
              Legacy
            </NavLink>
            <NavLink variant="button" color="text.primary" to="/sdk" sx={{ my: 1, mx: 1.5 }}>
              SDK Modules
            </NavLink>
            <NavLink variant="button" color="text.primary" to="/not-found-error" sx={{ my: 1, mx: 1.5 }}>
              Manifest not found
            </NavLink>
            <NavLink variant="button" color="text.primary" to="/use-module" sx={{ my: 1, mx: 1.5 }}>
              Use module hook
            </NavLink>
            <NavLink variant="button" color="text.primary" to="/api" sx={{ my: 1, mx: 1.5 }}>
              API updates
            </NavLink>
            <NavLink variant="button" color="text.primary" to="/remote-hooks" sx={{ my: 1, mx: 1.5 }}>
              Remote Hooks
            </NavLink>
            <NavLink variant="button" color="text.primary" to="/shared-store" sx={{ my: 1, mx: 1.5 }}>
              Shared Store
            </NavLink>
          </nav>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" component="main" sx={{ padding: 2 }}>
        <Outlet />
      </Container>
    </React.Fragment>
  );
}

export default RootLayout;
