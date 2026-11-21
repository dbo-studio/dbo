import type { PublicCardType } from '@/api/dashboard/types';
import ChartView from '@/components/common/ChartView/ChartView';
import { variables } from '@/core/theme/variables';
import { Box, Typography } from '@mui/material';
import type { JSX } from 'react';

export default function SharedCard({ card }: { card: PublicCardType }): JSX.Element {
  const rows = card.result?.rows ?? [];
  const columns = card.result?.columns?.map((column) => column.name) ?? Object.keys(rows[0] ?? {});

  return (
    <Box
      data-testid='shared-card'
      data-width={card.width}
      sx={{
        gridColumn: card.width === 2 ? 'span 2' : 'span 1',
        border: 1,
        borderColor: 'divider',
        borderRadius: variables.radius.small,
        p: 1,
        minWidth: 0,
        bgcolor: 'background.paper'
      }}
    >
      <Typography variant='subtitle2' noWrap sx={{ mb: 0.5 }}>
        {card.name}
      </Typography>
      {card.error ? (
        <Typography variant='caption' color='error' data-testid='shared-card-error'>
          {card.error}
        </Typography>
      ) : (
        <ChartView rows={rows} columns={columns} spec={card.chart} height={220} />
      )}
    </Box>
  );
}
