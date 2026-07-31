import { Typography } from '@mui/material';
import type { FormErrorProps } from './types';

export const FormError = ({ errors, mb }: FormErrorProps) => {
  if (errors.length < 1) {
    return null;
  }

  const error = errors[0];

  if (!error) {
    return null;
  }

  if (typeof error === 'string') {
    return (
      <Typography sx={{ marginBottom: mb }} color={'error'} variant='caption'>
        {error}
      </Typography>
    );
  }

  return (
    <Typography sx={{ marginBottom: mb, display: 'block' }} color={'error'} variant='caption'>
      {error.message}
    </Typography>
  );
};
