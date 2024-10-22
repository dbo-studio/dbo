import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import LoadingButton from '@/components/base/LoadingButton/LoadingButton';
import locales from '@/locales';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { checkUpdate } from '@tauri-apps/api/updater';
import { useState } from 'react';

export default function UpdatePanel() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const handleCheckUpdate = async () => {
    setLoading(true);
    try {
      const result = await checkUpdate();
      console.log('🚀 ~ handleCheckUpdate ~ result:', result);
    } catch (error) {
      console.log('🚀 ~ handleCheckUpdate ~ error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant='h6'>{locales.app_update}</Typography>

      <Box>
        <LoadingButton loading={loading} onClick={handleCheckUpdate} variant='outlined' color='primary' size='medium'>
          <Stack spacing={1} direction={'row'} alignItems={'center'}>
            <Typography variant='subtitle2'>{locales.check_for_updates}</Typography>
            <CustomIcon type={'refresh'} />
          </Stack>
        </LoadingButton>
      </Box>
    </Box>
  );
}
