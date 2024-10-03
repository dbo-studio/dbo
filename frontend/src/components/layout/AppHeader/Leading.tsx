import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { IconButton, Stack } from '@mui/material';

export default function Leading() {
  return (
    <Stack spacing={2} direction='row' justifyContent='flex-start'>
      <IconButton aria-label='settings'>
        <CustomIcon type={'settings'} size={'m'} />
      </IconButton>
    </Stack>
  );
}
