export const POSTGRES_SSL_MODES = [
  { value: 'disable', labelKey: 'ssl_mode_disable' as const },
  { value: 'allow', labelKey: 'ssl_mode_allow' as const },
  { value: 'prefer', labelKey: 'ssl_mode_prefer' as const },
  { value: 'require', labelKey: 'ssl_mode_require' as const },
  { value: 'verify-ca', labelKey: 'ssl_mode_verify_ca' as const },
  { value: 'verify-full', labelKey: 'ssl_mode_verify_full' as const }
] as const;

export const MYSQL_SSL_MODES = [
  { value: 'disable', labelKey: 'ssl_mode_disable' as const },
  { value: 'prefer', labelKey: 'ssl_mode_prefer' as const },
  { value: 'require', labelKey: 'ssl_mode_require' as const },
  { value: 'verify-ca', labelKey: 'ssl_mode_verify_ca' as const },
  { value: 'verify-full', labelKey: 'ssl_mode_verify_full' as const }
] as const;

export const DEFAULT_SSL_MODE = 'prefer';

export type ConnectionSSLFormValues = {
  sslMode: string;
  sslCaCert: string;
  sslClientCert: string;
  sslClientKey: string;
};

export function sslFormDefaults(
  ssl?: {
    mode?: string;
    caCert?: string;
    clientCert?: string;
    clientKey?: string;
  } | null
): ConnectionSSLFormValues {
  return {
    sslMode: ssl?.mode || DEFAULT_SSL_MODE,
    sslCaCert: ssl?.caCert ?? '',
    sslClientCert: ssl?.clientCert ?? '',
    sslClientKey: ssl?.clientKey ?? ''
  };
}

export function sslOptionsFromForm(values: ConnectionSSLFormValues): {
  mode: string;
  caCert?: string;
  clientCert?: string;
  clientKey?: string;
} {
  return {
    mode: values.sslMode || DEFAULT_SSL_MODE,
    ...(values.sslCaCert ? { caCert: values.sslCaCert } : {}),
    ...(values.sslClientCert ? { clientCert: values.sslClientCert } : {}),
    ...(values.sslClientKey ? { clientKey: values.sslClientKey } : {})
  };
}

export function showSSLCertFields(mode: string): boolean {
  return mode === 'require' || mode === 'verify-ca' || mode === 'verify-full';
}
