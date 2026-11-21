import locales from '@/locales';
import type { JSX } from 'react';
import { ChartEmptyText } from '../ChartView.styled';

export default function ChartEmpty(): JSX.Element {
  return (
    <ChartEmptyText variant='caption' color='textSubdued' data-testid='ai-chart' data-type='empty'>
      {locales.ai_tool_no_rows}
    </ChartEmptyText>
  );
}