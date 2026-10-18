import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import api from '@/api';
import type { useChangesetReview } from '@/hooks';
import locales from '@/locales';
import { IconButton, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import SchemaDiff from '../SchemaDiff/SchemaDiff';
import SqlPreview from '../SqlPreview/SqlPreview';
import {
  ChangesetSurfaceBodyStyled,
  ChangesetSurfaceHeaderStyled,
  ChangesetSurfaceStyled
} from './ChangesetSurface.styled';

type ChangesetSurfaceProps = {
  review: ReturnType<typeof useChangesetReview>;
  onClose: () => void;
};

/** Side surface of the workspace: the proposal as a schema diff, or as the SQL that would run. */
export default function ChangesetSurface({ review, onClose }: ChangesetSurfaceProps): JSX.Element | null {
  const [tab, setTab] = useState<'diff' | 'sql'>('diff');
  const { changeset } = review;
  const chatId = changeset?.chatId;
  const id = changeset?.id;
  const { data: before } = useQuery({
    queryKey: ['ai-changeset-before', chatId, id],
    queryFn: () => api.aiChat.getChangesetBefore({ chatId: chatId as number, id: id as number }),
    enabled: !!changeset
  });

  if (!changeset) return null;

  return (
    <ChangesetSurfaceStyled data-testid='ai-changeset-surface'>
      <ChangesetSurfaceHeaderStyled>
        <Typography variant='subtitle2' sx={{ flex: 1 }}>
          {locales.ai_changes_title}
        </Typography>
        <Tabs value={tab} onChange={(_, value: 'diff' | 'sql') => setTab(value)} sx={{ minHeight: 0 }}>
          <Tab value='diff' label={locales.ai_changes_tab_diff} data-testid='ai-changes-tab-diff' />
          <Tab value='sql' label={locales.ai_changes_tab_sql} data-testid='ai-changes-tab-sql' />
        </Tabs>
        <Tooltip title={locales.ai_changes_close}>
          <IconButton size='small' onClick={onClose} data-testid='ai-changes-close'>
            <CustomIcon type='close' size='xs' />
          </IconButton>
        </Tooltip>
      </ChangesetSurfaceHeaderStyled>
      <ChangesetSurfaceBodyStyled>
        {tab === 'diff' ? (
          <SchemaDiff
            changeset={changeset}
            before={before}
            onReview={(status, position) => void review.review(status, position)}
            onEdit={(position, op) => void review.edit(position, op)}
          />
        ) : (
          <SqlPreview changeset={changeset} />
        )}
      </ChangesetSurfaceBodyStyled>
    </ChangesetSurfaceStyled>
  );
}
