import type { UserPermissions } from '@/api/auth/types';
import locales from '@/locales';
import { Checkbox, TableCell, Tooltip, Typography } from '@mui/material';
import type { JSX } from 'react';

type PermissionKey = keyof UserPermissions;

const PERMISSION_META: {
  key: PermissionKey;
  column: string;
  testIdSuffix: string;
  title: string;
}[] = [
  {
    key: 'createConnection',
    column: locales.admin_perm_col_connection,
    testIdSuffix: 'create-connection',
    title: locales.admin_perm_create_connection
  },
  {
    key: 'aiSettings',
    column: locales.admin_perm_col_ai,
    testIdSuffix: 'ai-settings',
    title: locales.admin_perm_ai_settings
  },
  {
    key: 'mcpSettings',
    column: locales.admin_perm_col_mcp,
    testIdSuffix: 'mcp-settings',
    title: locales.admin_perm_mcp_settings
  }
];

export type AdminUserPermissionCellsProps = {
  value: UserPermissions;
  disabled?: boolean;
  testIdPrefix?: string;
  onChange: (next: UserPermissions) => void;
};

export function AdminUserPermissionHeaderCells(): JSX.Element {
  return (
    <>
      {PERMISSION_META.map((perm) => (
        <TableCell key={perm.key} align='center' sx={{ width: 52, px: 0.5 }}>
          <Tooltip title={perm.title}>
            <Typography component='span' variant='caption' sx={{ fontWeight: 600 }}>
              {perm.column}
            </Typography>
          </Tooltip>
        </TableCell>
      ))}
    </>
  );
}

export default function AdminUserPermissionCells({
  value,
  disabled = false,
  testIdPrefix = 'admin-perm',
  onChange
}: AdminUserPermissionCellsProps): JSX.Element {
  return (
    <>
      {PERMISSION_META.map((perm) => (
        <TableCell key={perm.key} align='center' sx={{ width: 52, px: 0.5 }}>
          <Tooltip title={perm.title}>
            <Checkbox
              size='small'
              checked={value[perm.key]}
              disabled={disabled}
              inputProps={{ 'aria-label': perm.title }}
              data-testid={`${testIdPrefix}-${perm.testIdSuffix}`}
              onChange={(_, checked): void => onChange({ ...value, [perm.key]: checked })}
            />
          </Tooltip>
        </TableCell>
      ))}
    </>
  );
}
