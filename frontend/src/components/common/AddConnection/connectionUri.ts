import { DEFAULT_SSL_MODE } from './ssl';

export type ConnectionUriEngine = 'postgresql' | 'mysql';

export type ConnectionUriFields = {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  sslMode: string;
};

export type ParsedConnectionUri = ConnectionUriFields & {
  redactedUri: string;
  lossy: boolean;
};

const PG_SCHEME = /^(postgres(ql)?):\/\//i;
const MYSQL_SCHEME = /^(mysql|mariadb):\/\//i;

const KNOWN_QUERY_KEYS = new Set([
  'sslmode',
  'ssl-mode',
  'sslrootcert',
  'sslcert',
  'sslkey',
  'tls',
  'charset',
  'parseTime',
  'loc',
  'allowNativePasswords'
]);

const DEFAULT_PORTS: Record<ConnectionUriEngine, string> = {
  postgresql: '5432',
  mysql: '3306'
};

export function parseConnectionUri(raw: string, engine: ConnectionUriEngine): ParsedConnectionUri | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  let normalized = trimmed;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
    normalized = `${engine === 'mysql' ? 'mysql' : 'postgres'}://${normalized}`;
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }

  if (engine === 'postgresql' && !PG_SCHEME.test(normalized) && !isGenericHostScheme(url.protocol)) {
    return null;
  }
  if (engine === 'mysql' && !MYSQL_SCHEME.test(normalized) && !isGenericHostScheme(url.protocol)) {
    return null;
  }

  const params = url.searchParams;
  const unsupported: string[] = [];
  params.forEach((_, key) => {
    if (!KNOWN_QUERY_KEYS.has(key)) {
      unsupported.push(key);
    }
  });

  // File-path SSL params in URI cannot round-trip into our PEM fields.
  const lossy = unsupported.length > 0 || params.has('sslrootcert') || params.has('sslcert') || params.has('sslkey');

  const sslMode = sslModeFromQuery(params, engine) || DEFAULT_SSL_MODE;
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const port = url.port || DEFAULT_PORTS[engine];

  const fields: ConnectionUriFields = {
    host: url.hostname,
    port,
    username: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    database,
    sslMode
  };

  return {
    ...fields,
    redactedUri: buildConnectionUri(fields, engine, { redact: true, extraParams: preservedParams(params, engine) }),
    lossy
  };
}

export function buildConnectionUri(
  fields: ConnectionUriFields,
  engine: ConnectionUriEngine,
  options?: { redact?: boolean; extraParams?: URLSearchParams }
): string {
  const scheme = engine === 'mysql' ? 'mysql' : 'postgres';
  const url = new URL(`${scheme}://placeholder`);
  url.hostname = fields.host || 'localhost';
  url.port = fields.port || DEFAULT_PORTS[engine];
  url.pathname = fields.database ? `/${fields.database}` : '/';

  const user = fields.username || '';
  if (options?.redact) {
    url.username = user;
    // Keep empty password slot out of the string when redacting.
  } else if (fields.password) {
    url.username = user;
    url.password = fields.password;
  } else {
    url.username = user;
  }

  url.search = '';
  if (engine === 'postgresql' && fields.sslMode) {
    url.searchParams.set('sslmode', fields.sslMode);
  }
  if (engine === 'mysql' && fields.sslMode) {
    const tls = mysqlTlsFromSslMode(fields.sslMode);
    if (tls) {
      url.searchParams.set('tls', tls);
    }
  }

  options?.extraParams?.forEach((value, key) => {
    if (!url.searchParams.has(key) && KNOWN_QUERY_KEYS.has(key) && !isSslQueryKey(key)) {
      url.searchParams.set(key, value);
    }
  });

  let out = url.toString();
  // URL always adds trailing slash for empty path; prefer no trailing slash when db empty.
  if (!fields.database) {
    out = out.replace(/\/(\?|$)/, '$1');
  }

  return out;
}

function isGenericHostScheme(protocol: string): boolean {
  return protocol === 'http:' || protocol === 'https:';
}

function isSslQueryKey(key: string): boolean {
  return key === 'sslmode' || key === 'ssl-mode' || key === 'tls' || key.startsWith('ssl');
}

function preservedParams(params: URLSearchParams, engine: ConnectionUriEngine): URLSearchParams {
  const out = new URLSearchParams();
  params.forEach((value, key) => {
    if (engine === 'mysql' && key === 'charset') {
      out.set(key, value);
    }
  });
  return out;
}

function sslModeFromQuery(params: URLSearchParams, engine: ConnectionUriEngine): string | undefined {
  if (engine === 'postgresql') {
    const mode = params.get('sslmode') || params.get('ssl-mode');
    return mode || undefined;
  }

  const tls = (params.get('tls') || '').toLowerCase();
  switch (tls) {
    case 'false':
    case '0':
      return 'disable';
    case 'preferred':
      return 'prefer';
    case 'skip-verify':
      return 'require';
    case 'true':
    case '1':
      return 'verify-full';
    default:
      return params.get('ssl-mode') || undefined;
  }
}

function mysqlTlsFromSslMode(mode: string): string | undefined {
  switch (mode) {
    case 'disable':
      return 'false';
    case 'prefer':
    case 'allow':
      return 'preferred';
    case 'require':
      return 'skip-verify';
    case 'verify-ca':
    case 'verify-full':
      return 'true';
    default:
      return undefined;
  }
}
