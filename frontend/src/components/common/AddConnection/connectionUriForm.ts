import type { ParsedConnectionUri } from './connectionUri';

type UriFormField = 'host' | 'port' | 'username' | 'database' | 'sslMode' | 'password';

type UriFormSetter = {
  setFieldValue: (name: UriFormField, value: string) => void;
};

/** Apply parsed URI fields into a connection form. Does not rewrite the uri field. */
export function applyParsedConnectionUri(form: UriFormSetter, parsed: ParsedConnectionUri): void {
  form.setFieldValue('host', parsed.host);
  form.setFieldValue('port', parsed.port);
  form.setFieldValue('username', parsed.username);
  form.setFieldValue('database', parsed.database);
  form.setFieldValue('sslMode', parsed.sslMode);
  if (parsed.password) {
    form.setFieldValue('password', parsed.password);
  }
}
