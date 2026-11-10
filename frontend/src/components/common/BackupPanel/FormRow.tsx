import { SettingGroup, SettingRow } from '@/components/common/Settings/SettingRow/SettingRow';
import type { JSX, ReactNode } from 'react';
import { RowControlStyled } from './BackupPanel.styled';

/** A form row in the settings style: label and hint on the left, the control on the right. */
export function FormRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }): JSX.Element {
  return <SettingRow label={label} description={hint} control={<RowControlStyled>{children}</RowControlStyled>} />;
}

export function FormGroup({ title, children }: { title?: string; children: ReactNode }): JSX.Element {
  return <SettingGroup title={title}>{children}</SettingGroup>;
}
