import { variables } from '@/core/theme/variables.ts';
import type { Theme } from '@mui/material/styles';
import type { StylesConfig } from 'react-select';

export const SelectInputStyles = (theme: Theme, size?: 'small' | 'medium'): StylesConfig => ({
  control: (_, { isFocused }) => ({
    color: theme.palette.text.text,
    display: 'flex',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: variables.radius.medium,
    height: size === 'small' ? '24px' : '32px',
    minWidth: '90px',
    backgroundColor: theme.palette.background.default,
    borderBottom: `1px solid ${isFocused ? theme.palette.primary.main : theme.palette.divider}`
  }),
  menu: (styles) => ({
    ...styles,
    padding: '0px 2px',
    backgroundColor: theme.palette.background.default
  }),
  option: (_, { isFocused }) => ({
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
  input: (styles) => ({
    ...styles,
    margin: 0,
    padding: 0,
    color: theme.palette.text.text
  }),
  singleValue: (styles) => ({
    ...styles,
    color: theme.palette.text.text,
    fontSize: size === 'small' ? theme.typography.caption.fontSize : theme.typography.body2.fontSize
  })
});
