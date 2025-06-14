'use client';

import { GitHub } from '@mui/icons-material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import { styled } from '@mui/material/styles';
import type { JSX } from 'react';
import * as React from 'react';
import ColorModeIconDropdown from './ColorModeIconDropdown';

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
  borderRadius: `calc(${theme.shape.borderRadius}px + 8px)`,
  backdropFilter: 'blur(24px)',
  border: '1px solid',
  borderColor: theme.palette.divider,
  backgroundColor: `rgba(${theme.palette.background.defaultChannel} / 0.4)`,
  boxShadow: theme.shadows[1],
  padding: '8px 12px'
}));

export default function AppAppBar(): JSX.Element {
  const [open, setOpen] = React.useState(false);

  const toggleDrawer = (newOpen: boolean) => (): void => {
    setOpen(newOpen);
  };

  return (
    <AppBar
      position='fixed'
      enableColorOnDark
      sx={{
        boxShadow: 0,
        bgcolor: 'transparent',
        backgroundImage: 'none',
        mt: 'calc(var(--template-frame-height, 0px) + 28px)'
      }}
    >
      <Container maxWidth='lg'>
        <StyledToolbar variant='dense' disableGutters>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', px: 0 }}>
            <GitHub />
            <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
              <Button variant='text' color='info' size='small'>
                Features
              </Button>
              <Button variant='text' color='info' size='small'>
                Testimonials
              </Button>
              <Button variant='text' color='info' size='small'>
                Highlights
              </Button>
              <Button variant='text' color='info' size='small'>
                Pricing
              </Button>
              <Button variant='text' color='info' size='small' sx={{ minWidth: 0 }}>
                FAQ
              </Button>
              <Button variant='text' color='info' size='small' sx={{ minWidth: 0 }}>
                Blog
              </Button>
            </Box>
          </Box>
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: 1,
              alignItems: 'center'
            }}
          >
            <Button color='primary' variant='text' size='small'>
              Sign in
            </Button>
            <Button color='primary' variant='contained' size='small'>
              Sign up
            </Button>
            <ColorModeIconDropdown />
          </Box>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1 }}>
            <ColorModeIconDropdown size='medium' />
            <IconButton aria-label='Menu button' onClick={toggleDrawer(true)}>
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor='top'
              open={open}
              onClose={toggleDrawer(false)}
              PaperProps={{
                sx: {
                  top: 'var(--template-frame-height, 0px)'
                }
              }}
            >
              <Box sx={{ p: 2, backgroundColor: 'background.default' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end'
                  }}
                >
                  <IconButton onClick={toggleDrawer(false)}>
                    <CloseRoundedIcon />
                  </IconButton>
                </Box>

                <MenuItem>Features</MenuItem>
                <MenuItem>Testimonials</MenuItem>
                <MenuItem>Highlights</MenuItem>
                <MenuItem>Pricing</MenuItem>
                <MenuItem>FAQ</MenuItem>
                <MenuItem>Blog</MenuItem>
                <Divider sx={{ my: 3 }} />
                <MenuItem>
                  <Button color='primary' variant='contained' fullWidth>
                    Sign up
                  </Button>
                </MenuItem>
                <MenuItem>
                  <Button color='primary' variant='outlined' fullWidth>
                    Sign in
                  </Button>
                </MenuItem>
              </Box>
            </Drawer>
          </Box>
        </StyledToolbar>
      </Container>
    </AppBar>
  );
}
