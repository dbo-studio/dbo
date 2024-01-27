import { Box, Theme, Typography, useTheme } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import { ConnectionItemStyles } from './ConnectionItem.styled';
import { ConnectionItemProps } from './types';

export default function ConnectionItem({ label, selected = false, onClick }: ConnectionItemProps) {
  const theme: Theme = useTheme();

  return (
    <ConnectionItemStyles theme={theme} selected={selected} onClick={onClick}>
      <Box maxHeight={50} maxWidth={50} textAlign={'center'}>
        <CustomIcon type='databaseOutline' size='l' />
        <Typography component={'p'} mt={1} variant='caption' noWrap>
          {label}
        </Typography>
      </Box>
    </ConnectionItemStyles>
  );
}
