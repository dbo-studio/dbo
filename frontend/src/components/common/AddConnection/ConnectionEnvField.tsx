import SelectInput from '@/components/base/SelectInput/SelectInput';
import locales from '@/locales';
import type { ConnectionEnv } from '@/types';
import type { JSX } from 'react';

const ENV_OPTIONS = [
  { value: 'none', label: locales.connection_env_none },
  { value: 'dev', label: locales.connection_env_dev },
  { value: 'uat', label: locales.connection_env_uat },
  { value: 'prod', label: locales.connection_env_prod }
];

type Props = {
  value: ConnectionEnv | '';
  onChange: (value: ConnectionEnv | '') => void;
};

/** What the server is used for; Prod locks writes. Same field on every engine. */
export default function ConnectionEnvField({ value, onChange }: Props): JSX.Element {
  return (
    <SelectInput
      label={locales.connection_env}
      testId='connection-env-select'
      value={value || 'none'}
      options={ENV_OPTIONS}
      onChange={(o): void => {
        const next = String((o as { value: unknown }).value);
        onChange((next === 'none' ? '' : next) as ConnectionEnv | '');
      }}
      helpertext={value === 'prod' ? locales.connection_env_prod_hint : locales.connection_env_hint}
    />
  );
}
