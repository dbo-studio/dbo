import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Button, Stack, Typography } from '@mui/material';

export default function Messages() {
  const currentChat = useAiStore((state) => state.currentChat);

  return (
    <Box display={'flex'} flex={1}>
      <Box flex={1} overflow={'auto'} p={1}>
        <Stack spacing={1}>
          {currentChat?.messages.map((m) => (
            <Box key={m.id} p={1} borderRadius={1} bgcolor={m.role === 'user' ? 'action.hover' : 'background.paper'}>
              <Stack direction={'row'} alignItems={'center'} justifyContent={'space-between'}>
                <Typography variant='caption' color='text.secondary'>
                  {m.role === 'user' ? 'You' : 'AI'}
                </Typography>
                {m.role === 'assistant' && (
                  <Button
                    size='small'
                    variant='text'
                    onClick={() => {
                      const getQuery = useTabStore.getState().getQuery;
                      const updateQuery = useTabStore.getState().updateQuery;
                      const current = getQuery?.() ?? '';
                      const next = current ? `${current}\n${m.content}` : m.content;
                      updateQuery?.(next);
                    }}
                    startIcon={<CustomIcon type='code' />}
                  >
                    درج در ادیتور
                  </Button>
                )}
              </Stack>
              <Typography variant='body2' whiteSpace={'pre-wrap'}>
                {m.content}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
