import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import { TabMode } from '@/core/enums';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { IconButton, Tooltip } from '@mui/material';
import { Box } from '@mui/system';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import type { CodeMessageProps } from '../../types';
import { CodeMessageHeaderStyled, CodeMessageStyled } from './CodeMessage.styled';

export default function CodeMessage({ message }: CodeMessageProps) {
  const [, copy] = useCopyToClipboard();
  const isDark = useSettingStore((state) => state.theme.isDark);

  const handleCopy = async (): Promise<void> => {
    try {
      await copy(message.content);
      toast.success(locales.copied);
    } catch (error) {
      console.debug('🚀 ~ handleCopy ~ error:', error);
    }
  };

  const handleInsert = (): void => {
    const selectedTab = useTabStore.getState().selectedTab();
    if (selectedTab?.mode === TabMode.Query) {
      useTabStore.getState().updateQuery(message.content);
    } else {
      useTabStore.getState().addEditorTab(message.content);
    }
    toast.success(locales.insert_into_editor);
  };

  const handleRun = (): void => {
    try {
      useDataStore.getState().runQueryInEditor(message.content);
    } catch (error) {
      console.debug('🚀 ~ handleRun ~ error:', error);
      toast.error(locales.error_occurred);
    }
  };

  return (
    <CodeMessageStyled>
      <CodeMessageHeaderStyled isdark={isDark?.toString() ?? 'false'}>
        <Box sx={{ ml: 1, display: 'flex' }}>
          <CustomIcon type='code' />
        </Box>
        <Box>
          <Tooltip title={locales.insert_into_editor}>
            <IconButton onClick={handleInsert}>
              <CustomIcon type='pen' />
            </IconButton>
          </Tooltip>
          <Tooltip title={locales.run_query}>
            <IconButton onClick={handleRun}>
              <CustomIcon type='play' />
            </IconButton>
          </Tooltip>
          <Tooltip title={locales.copy}>
            <IconButton onClick={() => void handleCopy()}>
              <CustomIcon type='copy' />
            </IconButton>
          </Tooltip>
        </Box>
      </CodeMessageHeaderStyled>
      <SyntaxHighlighter value={message.content} />
    </CodeMessageStyled>
  );
}
