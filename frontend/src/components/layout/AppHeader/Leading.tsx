import DarkModeToggle from '@/components/base/DarkModeToggle/DarkModeToggle';
import { Stack } from '@mui/material';

export default function Leading() {
  return (
    <Stack spacing={2} direction='row' justifyContent='flex-start'>
      <DarkModeToggle />
      {/* <IconButton aria-label='settings'>
        <CustomIcon type={'settings'} size={'m'} />
      </IconButton> */}
    </Stack>
  );
}
