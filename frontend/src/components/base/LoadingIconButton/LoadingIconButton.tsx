import { CircularProgress, IconButton, type IconButtonProps } from '@mui/material';

export default function LoadingIconButton(props: IconButtonProps) {
  return (
    <IconButton {...props}>
      {props.loading ? <CircularProgress size={15} color='primary' /> : props.children}
    </IconButton>
  );
}
