import { haptics } from '@/core/tauri/haptics';
import type { JSX, MouseEvent } from 'react';
import CustomIcon from '../CustomIcon/CustomIcon';
import {
  ListRowBodyStyled,
  ListRowChevronStyled,
  ListRowLeadingStyled,
  ListRowStyled,
  ListRowSubtitleStyled,
  ListRowTitleStyled
} from './ListRow.styled';
import type { ListRowProps } from './types';

export default function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  chevron,
  selected,
  onClick,
  onLongPress,
  testId
}: ListRowProps): JSX.Element {
  const handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    void haptics.selection();
    onLongPress?.();
  };

  return (
    <ListRowStyled
      onClick={onClick}
      onContextMenu={onLongPress ? handleContextMenu : undefined}
      aria-selected={selected || undefined}
      data-testid={testId}
    >
      {leading && <ListRowLeadingStyled>{leading}</ListRowLeadingStyled>}
      <ListRowBodyStyled>
        <ListRowTitleStyled>{title}</ListRowTitleStyled>
        {subtitle && <ListRowSubtitleStyled>{subtitle}</ListRowSubtitleStyled>}
      </ListRowBodyStyled>
      {trailing}
      {chevron && (
        <ListRowChevronStyled>
          <CustomIcon type='chevronRight' size='s' />
        </ListRowChevronStyled>
      )}
    </ListRowStyled>
  );
}
