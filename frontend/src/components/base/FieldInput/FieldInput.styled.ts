import { Box, InputBase, styled } from '@mui/material';
import type { InputBaseProps } from '@mui/material';

export const FieldInputLabelRowStyled = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: '4px'
});

type FieldInputInputStyledProps = {
  error?: boolean;
  margin?: InputBaseProps['margin'];
};

export const FieldInputInputStyled = styled(InputBase, {
  shouldForwardProp: (prop) => prop !== 'error' && prop !== 'margin'
})<FieldInputInputStyledProps>(({ theme, error, margin }) => ({
  borderColor: error ? theme.palette.error.main : theme.palette.divider,
  marginBottom: error || margin === 'none' ? '0px' : theme.spacing(1)
}));
