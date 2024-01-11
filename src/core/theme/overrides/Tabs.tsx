import { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

export default function Tabs(theme: Theme): Components {
  return {
    MuiTabs: {
      styleOverrides: {
        root: {
          display: 'flex',
          alignItems: 'center',
          padding: 0,
          minHeight: '30px'
        },
        indicator: {
          display: 'none'
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          minHeight: 30,
          height: 30,
          borderRadius: variables.radius.small,
          border: `1px solid transparent`,
          '& .MuiTabs-indicator': {
            display: 'none',
            background: '#fff'
          },
          '& .MuiTabs-indicatorSpan': {
            maxWidth: 40,
            width: '100%',
            backgroundColor: 'red'
          },
          '&.Mui-selected': {
            border: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary,
            fontWeight: theme.typography.fontWeightMedium,
            backgroundColor: theme.palette.background.paper
          },

          img: {
            marginRight: '8px'
          },

          '&.Mui-flat': {
            borderRadius: 0,
            borderTop: 'unset',
            img: {
              position: 'relative',
              right: '16px',
              opacity: 0,
              transition: 'opacity 0.1s'
            },

            '&:hover': {
              img: {
                opacity: 1
              }
            }
          },
          '&.grid-tab': {
            borderRight: `1px solid ${theme.palette.divider}`,
            borderBottom: 'unset',
            flex: 1,
            minWidth: '250px',
            '&.Mui-selected': {
              borderRight: `1px solid ${theme.palette.divider}`,
              borderLeft: 'unset'
            }
          }
        }
      }
    }
  };
}
