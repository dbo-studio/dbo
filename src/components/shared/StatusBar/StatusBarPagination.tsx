import { TabMode } from '@/src/types';
import { Box, IconButton, Typography } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';

export default function StatusBarPagination({ mode }: { mode: TabMode | undefined }) {
  return (
    <Box
      alignItems={'center'}
      mb={'5px'}
      justifyContent={'flex-end'}
      display={'flex'}
      flexDirection={'row'}
      width={208}
    >
      {!mode && mode == TabMode.Data && (
        <>
          <IconButton>
            <CustomIcon type='arrowLeft' size='s' />
          </IconButton>
          <Typography fontWeight={'bold'} textAlign={'center'} minWidth={54}>
            2
          </Typography>
          <IconButton>
            <CustomIcon type='arrowRight' size='s' />
          </IconButton>
        </>
      )}
    </Box>
  );
}
