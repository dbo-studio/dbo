import { Typography } from '@mui/material';
import type { StandardSchemaV1Issue } from '@tanstack/react-form';
import type { JSX } from 'react';

type Props = {
  errors: (string | StandardSchemaV1Issue | null | undefined)[];
  mb?: number;
};

export const FormError = ({ errors, mb }: Props): JSX.Element => {
  if (errors.length < 1) {
    return <></>;
  }

  const error = errors[0];

  if (!error) {
    return <></>;
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
