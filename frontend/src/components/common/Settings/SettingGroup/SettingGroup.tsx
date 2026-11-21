import { Typography } from '@mui/material';
import type { JSX, ReactNode } from 'react';
import { SettingGroupStyled } from './SettingGroup.styled';

export type SettingGroupProps = {
  id?: string;
  title?: string;
  children: ReactNode;
};

export function SettingGroup({ id, title, children }: SettingGroupProps): JSX.Element {
  return (
    <SettingGroupStyled data-settings-id={id}>
      {title ? (
        <Typography color='textSecondary' variant='caption' sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
          {title}
        </Typography>
      ) : null}
      {children}
    </SettingGroupStyled>
  );
}
