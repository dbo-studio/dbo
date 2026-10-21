import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useChangesetStore } from '@/store/changesetStore/changeset.store';
import { Button, Stack, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { AgentCardStyled } from '../AgentCards.styled';
import type { SchemaReview, SchemaSuggestion } from '../../utils/schemaReview';

/** The findings of a schema review; Fix turns one into a proposal reviewed like any other. */
export default function SchemaReviewCard({ review }: { review: SchemaReview }): JSX.Element {
  const chatId = useAiStore((state) => state.currentChat?.id);
  const upsert = useChangesetStore((state) => state.upsert);
  const [fixed, setFixed] = useState<number[]>([]);
  const { mutate: fix, isPending } = useMutation({
    mutationFn: async ({ suggestion }: { suggestion: SchemaSuggestion; index: number }) =>
      api.aiChat.proposeChangeset(Number(chatId), {
        database: review.database || undefined,
        schema: review.schema || undefined,
        ops: suggestion.ops ?? []
      }),
    onSuccess: (changeset, { index }) => {
      upsert([changeset]);
      setFixed((current) => [...current, index]);
    }
  });

  return (
    <AgentCardStyled data-testid='ai-review-card'>
      <Stack spacing={0.75} sx={{ px: 1, py: 0.75 }}>
        <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center' }}>
          <CustomIcon type='structure' size='xs' />
          <Typography variant='caption' sx={{ fontWeight: 600 }}>
            {review.suggestions.length === 0
              ? locales.ai_review_clean
              : locales.ai_review_title.replace('{n}', String(review.suggestions.length))}
          </Typography>
        </Stack>
        {review.suggestions.map((suggestion, index) => (
          <Stack
            key={suggestion.message}
            direction='row'
            spacing={1}
            sx={{ alignItems: 'flex-start' }}
            data-testid='ai-review-suggestion'
            data-kind={suggestion.kind}
          >
            <Typography variant='caption' sx={{ flex: 1, minWidth: 0 }}>
              {suggestion.message}
            </Typography>
            {!!suggestion.ops?.length && chatId !== undefined && (
              <Button
                size='small'
                variant='outlined'
                disabled={isPending || fixed.includes(index)}
                onClick={() => fix({ suggestion, index })}
                sx={{ flexShrink: 0, py: 0, minWidth: 0 }}
                data-testid='ai-review-fix'
              >
                {fixed.includes(index) ? locales.ai_review_fix_proposed : locales.ai_review_fix}
              </Button>
            )}
          </Stack>
        ))}
      </Stack>
    </AgentCardStyled>
  );
}
