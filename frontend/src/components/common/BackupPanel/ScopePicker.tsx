import { InputBase } from '@mui/material';
import api from '@/api';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { isMysqlDriver, isPostgresDriver } from '@/core/db/connectionAliases';
import locales from '@/locales';
import type { ConnectionType } from '@/types';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { FormRow } from './FormRow';

export type Scope = { connectionId: number | null; database: string; schema: string };

export const defaultDatabase = (c: ConnectionType | undefined): string =>
  c && 'database' in c.options ? (c.options.database ?? '') : '';

/** The scope for a connection: its own database, plus `public` for Postgres. */
export const scopeFor = (c: ConnectionType | undefined, database?: string): Scope => ({
  connectionId: c?.id ?? null,
  database: database ?? defaultDatabase(c),
  schema: c && isPostgresDriver(c.type) ? 'public' : ''
});

type Props = {
  connections: ConnectionType[];
  value: Scope;
  onChange: (scope: Scope) => void;
  /** Lock the connection, e.g. when editing a schedule. */
  connectionLocked?: boolean;
};

/**
 * Connection, database and schema as dropdowns filled from the server. If the server cannot list
 * them (no connection yet, offline) the field falls back to a text input so nothing is blocked.
 */
export default function ScopePicker({ connections, value, onChange, connectionLocked }: Props): JSX.Element {
  const connection = connections.find((c) => c.id === value.connectionId);
  const isPostgres = connection ? isPostgresDriver(connection.type) : false;
  const hasDatabase = connection ? isPostgres || isMysqlDriver(connection.type) : false;

  const { data: catalog } = useQuery({
    queryKey: ['backup-catalog', value.connectionId, value.database],
    queryFn: () =>
      api.query.autoComplete({ connectionId: value.connectionId as number, database: value.database || undefined }),
    enabled: value.connectionId !== null && hasDatabase,
    staleTime: 30_000,
    retry: false
  });

  const databases = catalog?.databases ?? [];
  const schemas = catalog?.schemas ?? [];
  // Keep a value the server did not list (a saved schedule, a typed name) selectable.
  const withCurrent = (list: string[], current: string): string[] =>
    current && !list.includes(current) ? [current, ...list] : list;

  return (
    <>
      <FormRow label={locales.backup_job_connection}>
        <SelectInput
          emptylabel={locales.backup_wizard_pick_connection}
          value={value.connectionId === null ? undefined : String(value.connectionId)}
          disabled={connectionLocked}
          onChange={(e) => {
            const picked = connections.find((c) => c.id === Number((e as SelectInputOption)?.value));
            onChange(scopeFor(picked));
          }}
          options={connections.map((c) => ({ label: c.name, value: String(c.id) }))}
          testId='scope-connection'
        />
      </FormRow>
      {hasDatabase && (
        <FormRow label={locales.backup_database}>
          {databases.length > 0 ? (
            <SelectInput
              emptylabel=''
              value={value.database}
              onChange={(e) => onChange({ ...value, database: (e as SelectInputOption).value as string })}
              options={withCurrent(databases, value.database).map((d) => ({ label: d, value: d }))}
              testId='scope-database'
            />
          ) : (
            <InputBase
              name='backup-database'
              value={value.database}
              onChange={(e) => onChange({ ...value, database: e.target.value })}
              margin='none'
            />
          )}
        </FormRow>
      )}
      {isPostgres && (
        <FormRow label={locales.backup_schema}>
          {schemas.length > 0 ? (
            <SelectInput
              emptylabel=''
              value={value.schema}
              onChange={(e) => onChange({ ...value, schema: (e as SelectInputOption).value as string })}
              options={withCurrent(schemas, value.schema).map((s) => ({ label: s, value: s }))}
              testId='scope-schema'
            />
          ) : (
            <InputBase
              value={value.schema}
              onChange={(e) => onChange({ ...value, schema: e.target.value })}
              margin='none'
            />
          )}
        </FormRow>
      )}
    </>
  );
}
