import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import { Box, Typography } from '@mui/material';
import type { JSX } from 'react';

type EmptyStateProps = {
  icon?: keyof typeof IconTypes;
  title: string;
  description?: string;
};

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
