import type { SxProps, Theme } from '@mui/material';
import { variables } from './variables';

export const bannerAlertSx: SxProps<Theme> = {
  borderRadius: variables.radius.small,
  '& .MuiAlert-message': {
    userSelect: 'text'
  }
};
