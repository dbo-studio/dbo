import locales from '@/locales';
import type { JSX } from 'react';
import type { RowCardBadgeTone, RowCardProps } from '../types';
import { formatCell } from '../utils';
import {
  RowCardBadgeStyled,
  RowCardFieldStyled,
  RowCardHeaderStyled,
  RowCardKeyStyled,
  RowCardLabelStyled,
  RowCardNullStyled,
  RowCardStyled,
  RowCardValueStyled
} from './RowCard.styled';

const PREVIEW_FIELDS = 3;

function CellText({ value }: { value: unknown }): JSX.Element {
  const text = formatCell(value);
  return text === null ? <RowCardNullStyled>NULL</RowCardNullStyled> : <>{text}</>;
}

export default function RowCard({ row, columns, state, onClick }: RowCardProps): JSX.Element {
  const primary = columns.find((c) => c.isPrimaryKey) ?? columns[0];
  const rest = columns.filter((c) => c !== primary).slice(0, PREVIEW_FIELDS);

  const badge: { label: string; tone: RowCardBadgeTone } | undefined = state.isRemoved
    ? { label: locales.mobile_row_removed, tone: 'danger' }
    : state.isUnsaved
      ? { label: locales.mobile_row_new, tone: 'success' }
      : state.isEdited
        ? { label: locales.mobile_row_edited, tone: 'warning' }
        : undefined;

  return (
    <RowCardStyled onClick={onClick} removed={state.isRemoved} data-testid={`mobile-row-${row.dbo_index}`}>
      <RowCardHeaderStyled>
        <RowCardKeyStyled>
          {primary && (
            <>
              {primary.name} = <CellText value={row[primary.name]} />
            </>
          )}
        </RowCardKeyStyled>
        {badge && <RowCardBadgeStyled tone={badge.tone}>{badge.label}</RowCardBadgeStyled>}
      </RowCardHeaderStyled>
      {rest.map((column) => (
        <RowCardFieldStyled key={column.name}>
          <RowCardLabelStyled>{column.name}</RowCardLabelStyled>
          <RowCardValueStyled>
            <CellText value={row[column.name]} />
          </RowCardValueStyled>
        </RowCardFieldStyled>
      ))}
    </RowCardStyled>
  );
}
