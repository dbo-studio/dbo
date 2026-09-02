import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import { graphToDbml } from '@/core/diagram/toDbml';
import { EMPTY_DIAGRAM_GRAPH } from '@/core/diagram/types';
import { useSchemaDiagramQuery } from '@/core/diagram/useSchemaDiagramQuery';
import { TabMode } from '@/core/enums';
import { useCurrentConnection, useSelectedTab } from '@/hooks';
import locales from '@/locales';
import type { DiagramTabType } from '@/types/Tab';
import { CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import { type JSX, useMemo } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import {
  DiagramSourceBodyStyled,
  DiagramSourceHeaderStyled,
  DiagramSourceLoadingStyled,
  DiagramSourceRootStyled
} from './DiagramSource.styled';

export default function DiagramSource(): JSX.Element {
  const selectedTab = useSelectedTab<DiagramTabType>();
  const currentConnection = useCurrentConnection();
  const [, copy] = useCopyToClipboard();

  const connectionId = currentConnection?.id;
  const database = selectedTab?.database ?? '';
  const schema = selectedTab?.schema ?? '';
  const focusTable = selectedTab?.focusTable;
  const enabled = Boolean(connectionId && selectedTab?.mode === TabMode.Diagram);

  const { data, isLoading } = useSchemaDiagramQuery({
    connectionId,
    database,
    schema,
    focusTable,
    enabled
  });

  const dbml = useMemo(() => graphToDbml(data ?? EMPTY_DIAGRAM_GRAPH), [data]);
  const isEmpty = !data || data.nodes.length === 0;

  const handleCopy = async (): Promise<void> => {
    try {
      await copy(dbml);
      toast.success(locales.copied);
    } catch (error) {
      console.debug('🚀 ~ handleCopy ~ error:', error);
    }
  };

  if (isLoading && isEmpty) {
    return (
      <DiagramSourceLoadingStyled>
        <CircularProgress size={30} />
      </DiagramSourceLoadingStyled>
    );
  }

  if (isEmpty) {
    return (
      <EmptyState icon='code' title={locales.diagram_empty_title} description={locales.diagram_empty_description} />
    );
  }

  return (
    <DiagramSourceRootStyled data-testid='diagram-source'>
      <DiagramSourceHeaderStyled>
        <Typography variant='caption' color='textSubdued'>
          {locales.dbml}
        </Typography>
        <Tooltip title={locales.copy}>
          <IconButton
            size='small'
            onClick={() => void handleCopy()}
            data-testid='diagram-source-copy'
            aria-label={locales.copy}
          >
            <CustomIcon type='copy' />
          </IconButton>
        </Tooltip>
      </DiagramSourceHeaderStyled>
      <DiagramSourceBodyStyled data-testid='diagram-source-dbml'>
        <SyntaxHighlighter value={dbml} lang='dbml' />
      </DiagramSourceBodyStyled>
    </DiagramSourceRootStyled>
  );
}
