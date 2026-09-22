import type { UserPermissions } from '@/api/auth/types';
import locales from '@/locales';
import { Checkbox, FormControlLabel, Stack } from '@mui/material';
import type { JSX } from 'react';

export type AdminUserPermissionsProps = {
  value: UserPermissions;
  disabled?: boolean;
  testIdPrefix?: string;
  onChange: (next: UserPermissions) => void;
};

export default function AdminUserPermissions({
  value,
  disabled = false,
  testIdPrefix = 'admin-perm',
  onChange
}: AdminUserPermissionsProps): JSX.Element {
  return (
    <Stack direction='row' spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
      <FormControlLabel
        sx={{ m: 0, gap: 0.25 }}
        control={
          <Checkbox
            size='small'
            checked={value.createConnection}
            disabled={disabled}
            data-testid={`${testIdPrefix}-create-connection`}
            onChange={(_, checked): void => onChange({ ...value, createConnection: checked })}
          />
        }
        label={locales.admin_perm_create_connection}
      />
      <FormControlLabel
        sx={{ m: 0, gap: 0.25 }}
        control={
          <Checkbox
            size='small'
            checked={value.aiSettings}
            disabled={disabled}
            data-testid={`${testIdPrefix}-ai-settings`}
            onChange={(_, checked): void => onChange({ ...value, aiSettings: checked })}
          />
        }
        label={locales.admin_perm_ai_settings}
      />
      <FormControlLabel
        sx={{ m: 0, gap: 0.25 }}
        control={
          <Checkbox
            size='small'
            checked={value.mcpSettings}
            disabled={disabled}
            data-testid={`${testIdPrefix}-mcp-settings`}
            onChange={(_, checked): void => onChange({ ...value, mcpSettings: checked })}
          />
        }
        label={locales.admin_perm_mcp_settings}
      />
    </Stack>
  );
}
