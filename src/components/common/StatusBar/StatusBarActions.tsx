import { Box, IconButton, Stack } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';

export default function StatusBarActions() {
  return (
    <Stack direction={'row'} mb={'5px'} justifyContent={'space-between'} width={208}>
      <Box>
        <IconButton>
          <CustomIcon type='plus' size='s' />
        </IconButton>

        <IconButton>
          <CustomIcon type='mines' size='s' />
        </IconButton>
      </Box>
      <Box ml={1} mr={1}>
        <IconButton>
          <CustomIcon type='check' size='s' />
        </IconButton>

        <IconButton>
          <CustomIcon type='close' size='s' />
        </IconButton>
      </Box>
      <Box>
        <IconButton>
          <CustomIcon type='refresh' size='s' />
        </IconButton>

        <IconButton>
          <CustomIcon type='stop' size='s' />
        </IconButton>
      </Box>
    </Stack>
  );
}
