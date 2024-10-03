import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { IconButton, Stack } from '@mui/material';
import { useSearchParams } from 'react-router-dom';

export default function Leading() {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <Stack spacing={2} direction='row' justifyContent='flex-start'>
      <IconButton
        aria-label='settings'
        onClick={() => {
          setSearchParams({
            ...searchParams,
            showSettings: 'true'
          });
        }}
      >
        <CustomIcon type={'settings'} size={'m'} />
      </IconButton>
    </Stack>
  );
}
