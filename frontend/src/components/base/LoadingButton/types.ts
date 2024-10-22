import type { ButtonProps } from '@mui/material';

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean | number;
}
