import { variables } from '@/core/theme/variables';
import { alpha, Box, InputBase, styled, Typography } from '@mui/material';
import type { DateTimePickerVariant } from './types';

export const DateTimePickerRoot = styled(Box)<{ variant: DateTimePickerVariant }>(({ variant }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  ...(variant === 'cell' && {
    height: '22px'
  })
}));

export const DateTimePickerLabelRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: '4px'
});

export const DateTimePickerLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.text
}));

export const DateTimeField = styled('div')<{ variant: DateTimePickerVariant }>(({ theme, variant }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  boxSizing: 'border-box',
  ...(variant === 'cell' && {
    height: '22px'
  }),
  // Keep spacing outside the positioned box so the icon centers on the input, not the margin.
  ...(variant === 'field' && {
    marginBottom: theme.spacing(1)
  })
}));

export const DateTimeCellInput = styled('input')(({ theme }) => ({
  width: '100%',
  height: '22px',
  margin: 0,
  border: `1px solid ${theme.palette.primary.main}`,
  borderRadius: variables.radius.small,
  padding: '2px 22px 2px 8px',
  maxWidth: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  background: theme.palette.background.default,
  color: theme.palette.text.text,
  fontFamily: 'inherit',
  fontSize: theme.typography.subtitle2.fontSize
}));

export const DateTimeFieldInput = styled(InputBase)({
  width: '100%',
  // Room for the calendar/clock trigger inside the InputBase chrome.
  paddingRight: '28px !important'
});

export const DateTimeIconButton = styled('button')<{ variant: DateTimePickerVariant }>(({ theme, variant }) => ({
  position: 'absolute',
  right: variant === 'cell' ? 2 : 8,
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: variant === 'cell' ? 18 : 20,
  height: variant === 'cell' ? 18 : 20,
  margin: 0,
  padding: 0,
  border: 'none',
  borderRadius: variables.radius.small,
  background: 'transparent',
  color: theme.palette.text.subdued,
  cursor: 'pointer',
  '&:hover': {
    color: theme.palette.text.text,
    backgroundColor: alpha(theme.palette.action.hover, 0.6)
  },
  '&:focus-visible': {
    outline: `1px solid ${theme.palette.primary.main}`,
    outlineOffset: 0
  },
  '&:disabled': {
    cursor: 'default',
    opacity: 0.5
  },
  '& svg': {
    display: 'block',
    color: 'inherit'
  }
}));

export const PickerPaper = styled(Box)(({ theme }) => ({
  background: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  boxShadow: '0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)',
  padding: 8,
  minWidth: 248,
  color: theme.palette.text.text,
  fontFamily: 'inherit',
  fontSize: theme.typography.subtitle2.fontSize,
  userSelect: 'none'
}));

export const PickerHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 4,
  marginBottom: 8,
  color: theme.palette.text.title,
  fontWeight: 500
}));

export const PickerNavButton = styled('button')(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  margin: 0,
  padding: 0,
  border: 'none',
  borderRadius: variables.radius.small,
  background: 'transparent',
  color: theme.palette.text.subdued,
  cursor: 'pointer',
  '&:hover': {
    color: theme.palette.text.text,
    backgroundColor: theme.palette.action.hover
  },
  '& svg': {
    color: 'inherit',
    display: 'block'
  }
}));

export const WeekdayRow = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 2,
  marginBottom: 4,
  color: theme.palette.text.subdued,
  fontSize: 11,
  textAlign: 'center'
}));

export const DayGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 2
});

export const DayCell = styled('button')<{
  selected?: boolean;
  today?: boolean;
  outside?: boolean;
}>(({ theme, selected, today, outside }) => ({
  width: 30,
  height: 28,
  margin: 0,
  padding: 0,
  border: today && !selected ? `1px solid ${theme.palette.primary.main}` : '1px solid transparent',
  borderRadius: variables.radius.small,
  background: selected ? theme.palette.primary.main : 'transparent',
  color: selected ? theme.palette.common.white : outside ? theme.palette.text.disabled : theme.palette.text.text,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 12,
  lineHeight: 1,
  '&:hover': {
    backgroundColor: selected ? theme.palette.primary.main : theme.palette.action.hover
  }
}));

export const TimeRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  marginTop: 8,
  paddingTop: 8,
  borderTop: `1px solid ${theme.palette.divider}`
}));

export const TimeSelect = styled('select')(({ theme }) => ({
  width: 52,
  height: 28,
  margin: 0,
  padding: '0 4px',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.small,
  background: theme.palette.background.subdued,
  color: theme.palette.text.text,
  fontFamily: 'inherit',
  fontSize: 12,
  outline: 'none',
  cursor: 'pointer',
  '&:focus': {
    borderColor: theme.palette.primary.main
  }
}));

export const TimeSep = styled('span')(({ theme }) => ({
  color: theme.palette.text.subdued,
  fontSize: 12
}));

export const PickerFooter = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  marginTop: 8,
  paddingTop: 8,
  borderTop: `1px solid ${theme.palette.divider}`
}));

export const PickerActionButton = styled('button')<{ actionVariant?: 'primary' | 'ghost' }>(
  ({ theme, actionVariant }) => ({
    flex: 1,
    height: 28,
    margin: 0,
    padding: '0 8px',
    border: actionVariant === 'primary' ? 'none' : `1px solid ${theme.palette.divider}`,
    borderRadius: variables.radius.small,
    background: actionVariant === 'primary' ? theme.palette.primary.main : 'transparent',
    color: actionVariant === 'primary' ? theme.palette.common.white : theme.palette.text.subdued,
    fontFamily: 'inherit',
    fontSize: 12,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor:
        actionVariant === 'primary' ? alpha(theme.palette.primary.main, 0.9) : theme.palette.action.hover,
      color: actionVariant === 'primary' ? theme.palette.common.white : theme.palette.text.text
    }
  })
);
