import { Box, Typography } from '@mui/material';
import type { JSX, ReactNode } from 'react';
import { SettingGroupStyled, SettingRowStyled } from './SettingRow.styled';

export type SettingRowProps = {
  id?: string;
  label: string;
  description?: ReactNode;
  control: ReactNode;
  highlighted?: boolean;
};

export function SettingRow({ id, label, description, control, highlighted }: SettingRowProps): JSX.Element {
  return (
    <SettingRowStyled data-settings-id={id} data-highlighted={highlighted ? 'true' : undefined}>
      <Box sx={{ minWidth: 0, pr: 2 }}>
        <Typography color='textTitle' variant='subtitle2'>
          {label}
        </Typography>
        {description ? (
          typeof description === 'string' ? (
            <Typography color='textText' variant='caption' component='div'>
              {description}
            </Typography>
          ) : (
            description
          )
        ) : null}
      </Box>
      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{control}</Box>
    </SettingRowStyled>
  );
}

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
