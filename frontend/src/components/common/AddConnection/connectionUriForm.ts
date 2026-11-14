import locales from '@/locales';
import { toast } from 'sonner';

import {
  buildConnectionUri,
  type ConnectionUriEngine,
  type ConnectionUriFields,
  type ParsedConnectionUri,
  parseConnectionUri
} from './connectionUri';

type UriFormField = 'host' | 'port' | 'username' | 'database' | 'sslMode' | 'password' | 'uri';

/** What the URI helpers need of a connection form: the shared fields, readable and writable. */
type UriForm = {
  state: { values: ConnectionUriFields & { uri: string } };
  setFieldValue: (name: UriFormField, value: string) => void;
};

/** Apply parsed URI fields into a connection form. Does not rewrite the uri field. */
export function applyParsedConnectionUri(form: Pick<UriForm, 'setFieldValue'>, parsed: ParsedConnectionUri): void {
  form.setFieldValue('host', parsed.host);
  form.setFieldValue('port', parsed.port);
  form.setFieldValue('username', parsed.username);
  form.setFieldValue('database', parsed.database);
  form.setFieldValue('sslMode', parsed.sslMode);
  if (parsed.password) {
    form.setFieldValue('password', parsed.password);
  }
}

/** Parse `raw` into the form's fields. Returns false when it is not a valid URI for the engine. */
export function syncFromUri(
  form: UriForm,
  engine: ConnectionUriEngine,
  raw: string,
  opts?: { redact?: boolean; warn?: boolean }
): boolean {
  const parsed = parseConnectionUri(raw, engine);
  if (!parsed) {
    return false;
  }

  applyParsedConnectionUri(form, parsed);
  if (opts?.redact) {
    form.setFieldValue('uri', parsed.redactedUri);
  }

  if (opts?.warn && parsed.lossy) {
    toast.warning(locales.uri_sync_lossy);
  }

  return true;
}

/** Carry the form's content across a Manual / Connection string switch, so neither side starts empty. */
export function switchUriMode(form: UriForm, engine: ConnectionUriEngine, toUri: boolean): void {
  const values = form.state.values;

  if (!values.uri.trim()) {
    if (toUri) {
      form.setFieldValue('uri', buildConnectionUri(values, engine, { redact: true }));
    }
    return;
  }

  if (!syncFromUri(form, engine, values.uri, { redact: true, warn: true }) && toUri) {
    toast.error(locales.uri_invalid);
  }
}

/** Copy the connection string without its password. */
export async function copyRedactedUri(form: UriForm, engine: ConnectionUriEngine): Promise<void> {
  const values = form.state.values;
  const redacted =
    (values.uri ? parseConnectionUri(values.uri, engine)?.redactedUri : undefined) ??
    buildConnectionUri(values, engine, { redact: true });

  await navigator.clipboard.writeText(redacted);
  toast.success(locales.uri_copied);
}
