import { CircularProgress, IconButton, type IconButtonProps } from '@mui/material';
import type { JSX } from 'react';

export default function LoadingIconButton(props: IconButtonProps): JSX.Element {
  return (
    <IconButton {...props}>
      {props.loading ? <CircularProgress size={15} color='primary' /> : props.children}
    </IconButton>
  );
}
