import { DEFAULT_SSL_MODE } from './ssl';

export type ConnectionUriEngine = 'postgresql' | 'mysql' | 'sqlserver' | 'clickhouse';

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

const SCHEMES: Record<ConnectionUriEngine, RegExp> = {
  postgresql: /^(postgres(ql)?):\/\//i,
  mysql: /^(mysql|mariadb):\/\//i,
  sqlserver: /^(sqlserver|mssql):\/\//i,
  clickhouse: /^clickhouse:\/\//i
};

/** The scheme written when building a URI, and assumed when a pasted string has none. */
const DEFAULT_SCHEME: Record<ConnectionUriEngine, string> = {
  postgresql: 'postgres',
  mysql: 'mysql',
  sqlserver: 'sqlserver',
  clickhouse: 'clickhouse'
};

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
  'allowNativePasswords',
  'database',
  'encrypt',
  'trustservercertificate',
  'secure',
  'skip_verify',
  'dial_timeout'
]);

export const DEFAULT_PORTS: Record<ConnectionUriEngine, string> = {
  postgresql: '5432',
  mysql: '3306',
  sqlserver: '1433',
  clickhouse: '9000'
};

export const URI_PLACEHOLDER: Record<ConnectionUriEngine, string> = {
  postgresql: 'postgres://username:password@hostname:port/dbname',
  mysql: 'mysql://username:password@hostname:port/dbname',
  sqlserver: 'sqlserver://username:password@hostname:port?database=dbname',
  clickhouse: 'clickhouse://username:password@hostname:port/dbname'
};

export function parseConnectionUri(raw: string, engine: ConnectionUriEngine): ParsedConnectionUri | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  let normalized = trimmed;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
    normalized = `${DEFAULT_SCHEME[engine]}://${normalized}`;
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }

  if (!SCHEMES[engine].test(normalized) && !isGenericHostScheme(url.protocol)) {
    return null;
  }

  const params = url.searchParams;
  const unsupported: string[] = [];
  params.forEach((_, key) => {
    if (!isKnownQueryKey(key)) {
      unsupported.push(key);
    }
  });

  // File-path SSL params in URI cannot round-trip into our PEM fields.
  const lossy =
    unsupported.length > 0 ||
    (engine === 'sqlserver' && url.pathname.replace(/^\//, '') !== '') || params.has('sslrootcert') || params.has('sslcert') || params.has('sslkey');

  const sslMode = sslModeFromQuery(params, engine) || (HOST_ENGINES.has(engine) ? 'disable' : DEFAULT_SSL_MODE);
  // SQL Server's path names an instance, not a database, so its database travels in the query.
  const database =
    engine === 'sqlserver' ? params.get('database') || '' : decodeURIComponent(url.pathname.replace(/^\//, ''));
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
  const url = new URL(`${DEFAULT_SCHEME[engine]}://placeholder`);
  url.hostname = fields.host || 'localhost';
  url.port = fields.port || DEFAULT_PORTS[engine];
  url.pathname = engine === 'sqlserver' ? '' : fields.database ? `/${fields.database}` : '/';

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

  if (engine === 'sqlserver') {
    if (fields.database) {
      url.searchParams.set('database', fields.database);
    }
    url.searchParams.set('encrypt', String(fields.sslMode !== 'disable'));
    if (fields.sslMode !== 'disable' && fields.sslMode !== 'verify-ca' && fields.sslMode !== 'verify-full') {
      url.searchParams.set('TrustServerCertificate', 'true');
    }
  }
  if (engine === 'clickhouse' && fields.sslMode !== 'disable') {
    url.searchParams.set('secure', 'true');
    if (fields.sslMode !== 'verify-ca' && fields.sslMode !== 'verify-full') {
      url.searchParams.set('skip_verify', 'true');
    }
  }

  options?.extraParams?.forEach((value, key) => {
    if (!url.searchParams.has(key) && KNOWN_QUERY_KEYS.has(key) && !isSslQueryKey(key)) {
      url.searchParams.set(key, value);
    }
  });

  let out = url.toString();
  // URL always adds trailing slash for empty path; prefer no trailing slash when db empty.
  if (!fields.database && engine !== 'sqlserver') {
    out = out.replace(/\/(\?|$)/, '$1');
  }

  return out;
}

function isGenericHostScheme(protocol: string): boolean {
  return protocol === 'http:' || protocol === 'https:';
}

const HOST_ENGINES = new Set<ConnectionUriEngine>(['sqlserver', 'clickhouse']);

function isKnownQueryKey(key: string): boolean {
  return KNOWN_QUERY_KEYS.has(key) || KNOWN_QUERY_KEYS.has(key.toLowerCase());
}

function isSslQueryKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower === 'sslmode' ||
    lower === 'ssl-mode' ||
    lower === 'tls' ||
    lower === 'encrypt' ||
    lower === 'trustservercertificate' ||
    lower === 'secure' ||
    lower === 'skip_verify' ||
    lower.startsWith('ssl')
  );
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

  if (engine === 'sqlserver') {
    const encrypt = (params.get('encrypt') || '').toLowerCase();
    if (!['true', '1', 'strict', 'yes'].includes(encrypt)) {
      return 'disable';
    }
    const trust = (params.get('TrustServerCertificate') || params.get('trustservercertificate') || '').toLowerCase();
    return ['true', '1', 'yes'].includes(trust) ? 'require' : 'verify-full';
  }

  if (engine === 'clickhouse') {
    if ((params.get('secure') || '').toLowerCase() !== 'true') {
      return 'disable';
    }
    return (params.get('skip_verify') || '').toLowerCase() === 'true' ? 'require' : 'verify-full';
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
