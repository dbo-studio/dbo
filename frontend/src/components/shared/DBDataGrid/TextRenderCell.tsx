import type { CustomCellRendererProps } from '@/components/shared/DBDataGrid/types';
import { Tooltip, Typography } from '@mui/material';

export default function TextRenderCell<TRow, TSummaryRow>({ row, column }: CustomCellRendererProps<TRow, TSummaryRow>) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const value = row[column.key] as string;

  return (
    <Tooltip title={value} placement={'bottom'}>
      <Typography variant={'body2'} maxWidth={400}>
        {value}
      </Typography>
    </Tooltip>
  );
}
