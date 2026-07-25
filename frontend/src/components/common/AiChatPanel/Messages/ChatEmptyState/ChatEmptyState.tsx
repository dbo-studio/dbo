import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { TabMode } from '@/core/enums';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { selectTabs, useTabStore } from '@/store/tabStore/tab.store';
import { Button, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import { getChatPromptSuggestions } from '../../utils/chatPromptSuggestions';

type ChatEmptyStateProps = {
  onSelectPrompt: (prompt: string) => void;
};

export default function ChatEmptyState({ onSelectPrompt }: ChatEmptyStateProps) {
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const tabs = useTabStore(selectTabs);
  const getQuery = useTabStore((state) => state.getQuery);
  const context = useAiStore((state) => state.context);

  const selectedTab = tabs.find((tab) => tab.id === selectedTabId);
  const editorQuery = selectedTab?.mode === TabMode.Query ? (getQuery(selectedTab.id) || '').trim() : '';

  const promptKeys = useMemo(() => getChatPromptSuggestions(context, editorQuery), [context, editorQuery]);

  return (
    <Stack
      spacing={2.5}
      sx={{
        flex: 1,
        py: 3,
        px: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200
      }}
    >
      <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <CustomIcon type='wand_sparkles' size='m' />
        <Typography variant='subtitle2' color='textText'>
          {locales.ai_welcome_title}
        </Typography>
        <Typography variant='caption' color='textSubdued' sx={{ maxWidth: 280, lineHeight: 1.5 }}>
          {locales.ai_welcome_subtitle}
        </Typography>
      </Stack>
      <Stack spacing={0.75} sx={{ width: '100%' }}>
        {promptKeys.map((key) => (
          <Button
            key={key}
            variant='outlined'
            size='small'
            onClick={() => onSelectPrompt(locales[key])}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              textAlign: 'left',
              py: 0.75,
              borderColor: 'divider',
              color: 'text.text',
              fontWeight: 400,
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover'
              }
            }}
          >
            {locales[key]}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}
