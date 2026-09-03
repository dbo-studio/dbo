import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import locales from '@/locales';
import { Box, Typography } from '@mui/material';
import type { JSX } from 'react';

import SSLCertField from './SSLCertField';
import { MYSQL_SSL_MODES, POSTGRES_SSL_MODES, showSSLCertFields } from './ssl';
import type { ConnectionSSLFieldsProps } from './types';

export default function ConnectionSSLFields({
  engine,
  mode,
  caCert,
  clientCert,
  clientKey,
  onModeChange,
  onCaCertChange,
  onClientCertChange,
  onClientKeyChange
}: ConnectionSSLFieldsProps): JSX.Element {
  const modes = engine === 'postgresql' ? POSTGRES_SSL_MODES : MYSQL_SSL_MODES;
  const options: SelectInputOption[] = modes.map((item) => ({
    value: item.value,
    label: locales[item.labelKey]
  }));

  const helpMap: Record<string, string> = {
    disable: locales.ssl_mode_help_disable,
    allow: locales.ssl_mode_help_allow,
    prefer: locales.ssl_mode_help_prefer,
    require: locales.ssl_mode_help_require,
    'verify-ca': locales.ssl_mode_help_verify_ca,
    'verify-full': locales.ssl_mode_help_verify_full
  };
  const helpText = helpMap[mode] ?? locales.ssl_mode_help_prefer;

  return (
    <Box data-testid='connection-ssl-fields' sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant='caption' color='textText'>
        {locales.ssl_mode}
      </Typography>
      <SelectInput
        testId='ssl-mode-select'
        classNamePrefix='ssl-mode'
        value={mode}
        options={options}
        onChange={(option): void => {
          const value = (option as SelectInputOption | null)?.value;
          if (typeof value === 'string') {
            onModeChange(value);
          }
        }}
      />
      <Typography variant='caption' color='textSecondary' sx={{ mb: 1 }} data-testid='ssl-mode-help'>
        {helpText}
      </Typography>

      {showSSLCertFields(mode) && (
        <>
          <SSLCertField
            name='sslCaCert'
            testId='ssl-textarea-sslCaCert'
            label={locales.ssl_ca_cert}
            value={caCert}
            placeholder={locales.ssl_cert_placeholder}
            onChange={onCaCertChange}
          />
          <SSLCertField
            name='sslClientCert'
            testId='ssl-textarea-sslClientCert'
            label={locales.ssl_client_cert}
            value={clientCert}
            placeholder={locales.ssl_cert_placeholder}
            onChange={onClientCertChange}
          />
          <SSLCertField
            name='sslClientKey'
            testId='ssl-textarea-sslClientKey'
            label={locales.ssl_client_key}
            value={clientKey}
            placeholder={locales.ssl_key_placeholder}
            onChange={onClientKeyChange}
          />
        </>
      )}
    </Box>
  );
}
