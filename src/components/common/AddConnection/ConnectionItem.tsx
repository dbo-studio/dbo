import { variables } from '@/src/core/theme/variables';
import { Box, Typography, useTheme } from '@mui/material';
import Image from 'next/image';
import { ConnectionType } from './types';

export default function ConnectionItem({ connection }: { connection: ConnectionType }) {
  const theme = useTheme();

  return (
    <Box p={theme.spacing(2)}>
      <Box
        width={40}
        height={40}
        display={'flex'}
        justifyContent={'center'}
        alignItems={'center'}
        borderRadius={variables.radius.small}
        bgcolor={theme.palette.grey[300]}
      >
        <Image width={25} height={25} alt={connection.name} src={connection.logo} />
      </Box>
      <Typography>{connection.name}</Typography>
    </Box>
  );
}
