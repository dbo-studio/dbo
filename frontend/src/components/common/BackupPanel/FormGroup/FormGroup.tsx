import { SettingGroup } from '@/components/common/Settings/SettingGroup/SettingGroup';
import type { JSX, ReactNode } from 'react';

export function FormGroup({ title, children }: { title?: string; children: ReactNode }): JSX.Element {
  return <SettingGroup title={title}>{children}</SettingGroup>;
}