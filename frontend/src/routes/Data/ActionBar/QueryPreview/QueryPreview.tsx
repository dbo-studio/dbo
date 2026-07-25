import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { IconButton, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import { QueryPreviewEditButtonStyled, QueryPreviewStyled } from './QueryPreview.styled';

export default function QueryPreview(): JSX.Element {
  const getQuery = useTabStore((state) => state.getQuery);
  const addEditorTab = useTabStore((state) => state.addEditorTab);
  const query = getQuery();

  const handleOpenInEditor = (): void => {
    if (!query.trim()) {
      return;
    }

    addEditorTab(query);
  };

  return (
    <QueryPreviewStyled>
      <SyntaxHighlighter value={query} />
      <QueryPreviewEditButtonStyled>
        <Tooltip title={locales.open_editor}>
          <span>
            <IconButton
              size='small'
              onClick={handleOpenInEditor}
              disabled={!query.trim()}
              aria-label={locales.open_editor}
              sx={{
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                '&:hover': { bgcolor: 'background.paper' }
              }}
            >
              <CustomIcon type='pen' size='xs' />
            </IconButton>
          </span>
        </Tooltip>
      </QueryPreviewEditButtonStyled>
    </QueryPreviewStyled>
  );
}
