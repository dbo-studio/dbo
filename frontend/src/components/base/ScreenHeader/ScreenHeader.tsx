import locales from '@/locales';
import { IconButton } from '@mui/material';
import type { JSX } from 'react';
import CustomIcon from '../CustomIcon/CustomIcon';
import {
  ScreenHeaderActionsStyled,
  ScreenHeaderRowStyled,
  ScreenHeaderStyled,
  ScreenHeaderTitleStyled
} from './ScreenHeader.styled';
import type { ScreenHeaderProps } from './types';

export default function ScreenHeader({ title, onBack, backLabel, actions }: ScreenHeaderProps): JSX.Element {
  return (
    <ScreenHeaderStyled>
      <ScreenHeaderRowStyled>
        {onBack && (
          <IconButton aria-label={backLabel ?? locales.back} onClick={onBack}>
            <CustomIcon type='chevronLeft' size='m' />
          </IconButton>
        )}
        <ScreenHeaderTitleStyled>{title}</ScreenHeaderTitleStyled>
        {actions && <ScreenHeaderActionsStyled>{actions}</ScreenHeaderActionsStyled>}
      </ScreenHeaderRowStyled>
    </ScreenHeaderStyled>
  );
}
