import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Box, Typography } from '@mui/material';
import type { JSX } from 'react';
import type { EmptyStateProps } from './types';

export default function EmptyState({ icon, title, description }: EmptyStateProps): JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        p: 3,
        textAlign: 'center',
        minHeight: 120
      }}
    >
      {icon && <CustomIcon type={icon} size='m' />}
      <Typography variant='subtitle2' color='textTitle'>
        {title}
      </Typography>
      {description && (
        <Typography variant='caption' color='textSubdued' sx={{ maxWidth: 320 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}
