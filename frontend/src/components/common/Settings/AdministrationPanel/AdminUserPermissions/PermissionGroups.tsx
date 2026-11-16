import api from '@/api';
import type { PermissionDef, UserPermissions } from '@/api/auth/types';
import { permissionGroupLabel, permissionHint, permissionLabel } from '@/core/auth/permissionText';
import locales from '@/locales';
import { Box, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';

/** The backend's permission list; it does not change while the app runs. */
export function usePermissionCatalog(): PermissionDef[] | undefined {
  return useQuery({ queryKey: ['admin-permissions'], queryFn: api.adminUsers.listPermissions, staleTime: Infinity })
    .data;
}

/** A complete set: the value where it has one, the catalog's default for the rest. */
export const withDefaults = (catalog: PermissionDef[], value: UserPermissions): UserPermissions =>
  Object.fromEntries(catalog.map((def) => [def.key, value[def.key] ?? def.default]));

export const grantedCount = (catalog: PermissionDef[], value: UserPermissions): number =>
  catalog.filter((def) => value[def.key]).length;

type Props = {
  value: UserPermissions;
  disabled?: boolean;
  testIdPrefix?: string;
  onChange: (next: UserPermissions) => void;
};

/** Permissions sorted into their groups (Connections, Data, AI, Backup, Boards), built from the backend's list. */
export default function PermissionGroups({
  value,
  disabled = false,
  testIdPrefix = 'admin-perm',
  onChange
}: Props): JSX.Element {
  const catalog = usePermissionCatalog();

  if (!catalog) {
    return (
      <Typography variant='caption' color='textText'>
        {locales.admin_permissions_loading}
      </Typography>
    );
  }

  const current = withDefaults(catalog, value);
  const groups = [...new Set(catalog.map((def) => def.group))];

  return (
    <Stack spacing={1.5} data-testid={`${testIdPrefix}-groups`}>
      {groups.map((group) => (
        <Box key={group} data-testid={`${testIdPrefix}-group-${group}`}>
          <Typography color='textTitle' variant='caption' sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>
            {permissionGroupLabel(group)}
          </Typography>
          <Stack>
            {catalog
              .filter((def) => def.group === group)
              .map((def) => (
                <FormControlLabel
                  key={def.key}
                  sx={{ m: 0, alignItems: 'flex-start' }}
                  control={
                    <Checkbox
                      size='small'
                      checked={current[def.key]}
                      disabled={disabled}
                      data-testid={`${testIdPrefix}-${def.key.replace('.', '-')}`}
                      onChange={(_, checked): void => onChange({ ...current, [def.key]: checked })}
                    />
                  }
                  label={
                    <Box sx={{ pt: 0.5 }}>
                      <Typography variant='body2' color='textTitle'>
                        {permissionLabel(def.key)}
                      </Typography>
                      <Typography variant='caption' color='textText'>
                        {permissionHint(def.key)}
                      </Typography>
                    </Box>
                  }
                />
              ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
