import type { Components, Theme } from '@mui/material/styles';
import { variables } from '../variables';

export default function Tabs(theme: Theme): Components {
  return {
    MuiTabs: {
      styleOverrides: {
        root: {
          display: 'flex',
          alignItems: 'center',
          padding: 0,
          minHeight: '35px',
          borderBottom: `1px solid ${theme.palette.divider}`,
          '&.MuiTabs-flat': {
            minHeight: '35px'
          }
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
          color: theme.palette.text.subdued,
          border: '1px solid transparent',
          '&.Mui-selected': {
            border: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary,
            fontWeight: theme.typography.fontWeightMedium,
            backgroundColor: theme.palette.background.primary
          },
          svg: {
            marginRight: '8px'
          },
          '&.Mui-flat': {
            borderRadius: 0,
            minHeight: 35,
            height: 35,
            borderTop: '2px solid transparent',
            borderRight: `1px solid ${theme.palette.divider}`,
            borderBottom: 'none',
            borderLeft: 'none',
            color: theme.palette.text.subdued,
            '&.Mui-selected': {
              border: 'none',
              borderTop: `2px solid ${theme.palette.primary.main}`,
              borderRight: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.default,
              color: theme.palette.text.text
            },
            '&:last-of-type': {
              borderRight: 'none'
            }
          },
          '&.grid-tab': {
            borderRight: `1px solid ${theme.palette.divider}`,
            borderBottom: 'unset',
            flex: 1,
            minWidth: '250px',
            '&.Mui-selected': {
              borderRight: `1px solid ${theme.palette.divider}`,
              borderLeft: 'unset',
              span: {
                color: theme.palette.text.primary
              }
            }
          }
        }
      }
    }
  };
}
