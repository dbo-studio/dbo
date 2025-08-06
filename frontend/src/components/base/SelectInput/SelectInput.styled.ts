import { ThemeModeEnum } from '@/core/enums';
import { variables } from '@/core/theme/variables.ts';
import type { Theme } from '@mui/material/styles';
import type { StylesConfig } from 'react-select';

export const SelectInputStyles = (
  theme: Theme,
  error: undefined | boolean,
  size?: 'small' | 'medium'
): StylesConfig => ({
  control: (_, { isFocused }): any => ({
    color: theme.palette.text.text,
    display: 'flex',
    border: `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
    marginBottom: !error ? '0px' : theme.spacing(1),
    borderRadius: variables.radius.medium,
    height: size === 'small' ? '24px' : '32px',
    minWidth: '90px',
    backgroundColor: theme.palette.background.default,
    borderBottom: error
      ? `1px solid ${theme.palette.error.main}`
      : `1px solid ${isFocused
        ? theme.palette.mode === ThemeModeEnum.Dark
          ? theme.palette.primary.dark
          : theme.palette.primary
        : theme.palette.divider
      }`,
    alignItems: 'center'
  }),
  menu: (styles): any => ({
    ...styles,
    padding: '0px 2px',
    backgroundColor: theme.palette.background.default,
    cursor: 'pointer'
  }),
  option: (_, { isFocused }): any => ({
    padding: '4px 8px',
    overflow: 'hidden',
    color: theme.palette.text.text,
    borderRadius: variables.radius.small,
    fontSize: size === 'small' ? theme.typography.caption.fontSize : theme.typography.body2.fontSize,
    backgroundColor: isFocused ? theme.palette.background.paper : theme.palette.background.default,
    ':hover': {
      backgroundColor: theme.palette.background.paper
    }
  }),
  input: (styles): any => ({
    ...styles,
    margin: 0,
    padding: 0,
    color: theme.palette.text.text,
    fontSize: size === 'small' ? theme.typography.caption.fontSize : theme.typography.body2.fontSize
  }),
  singleValue: (styles): any => ({
    ...styles,
    color: theme.palette.text.text,
    fontSize: size === 'small' ? theme.typography.caption.fontSize : theme.typography.body2.fontSize
  }),
  // Updated multi-value components
  multiValue: (base): any => ({
    ...base,
    flexShrink: 0,
    margin: '2px 4px 2px 0',
    backgroundColor: theme.palette.primary.light,
    borderRadius: variables.radius.small
  }),

  multiValueLabel: (styles): any => ({
    ...styles,
    color: theme.palette.primary.contrastText,
    fontSize: size === 'small' ? theme.typography.caption.fontSize : theme.typography.body2.fontSize,
    padding: '2px 4px',
    fontWeight: 500
  }),

  multiValueRemove: (styles): any => ({
    ...styles,
    color: theme.palette.primary.contrastText,
    opacity: 0.7,
    ':hover': {
      backgroundColor: theme.palette.primary.dark,
      color: theme.palette.common.white,
      opacity: 1
    }
  }),

  valueContainer: (base): any => ({
    ...base,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    overflow: 'auto',
    padding: '2px 8px',
    maxWidth: '100%',
    '&::-webkit-scrollbar': {
      height: '4px'
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.divider,
      borderRadius: '2px'
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent'
    }
  }),

  placeholder: (styles): any => ({
    ...styles,
    fontSize: size === 'small' ? theme.typography.caption.fontSize : theme.typography.body2.fontSize
  }),

  menuPortal: (styles): any => ({
    ...styles,
    zIndex: 99999,
  })
});
