import { CircularProgress, IconButton } from '@mui/material';
import { LoadingIconButtonProps } from './types';

export default function LoadingIconButton(props: LoadingIconButtonProps) {
  return (
    <IconButton {...props}>
      {props.loading ? <CircularProgress size={15} color='primary' /> : props.children}
    </IconButton>
  );
}
