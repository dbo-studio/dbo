import { Button, CircularProgress } from '@mui/material';
import type { LoadingButtonProps } from './types';

export default function LoadingButton(props: LoadingButtonProps) {
  return <Button {...props}>{props.loading ? <CircularProgress size={15} color='primary' /> : props.children}</Button>;
}
