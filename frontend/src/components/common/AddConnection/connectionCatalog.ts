import locales from '@/locales';

export type CatalogGroup = { id: string; label: string; types: string[] };

/** How the picker groups engines. Anything not listed here lands in the last group. */
export const CATALOG_GROUPS: CatalogGroup[] = [
  {
    id: 'relational',
    label: locales.connection_group_relational,
    types: ['postgresql', 'mysql', 'mariadb', 'sqlite', 'sqlserver', 'clickhouse', 'percona', 'timescaledb']
  },
  {
    id: 'cloud',
    label: locales.connection_group_cloud,
    types: [
      'supabase',
      'neon',
      'alloydb',
      'rds_postgresql',
      'rds_mysql',
      'aurora_postgresql',
      'aurora_mysql',
      'cloudsql_postgresql',
      'cloudsql_mysql',
      'azure_postgresql',
      'azure_mysql'
    ]
  },
  {
    id: 'nosql',
    label: locales.connection_group_nosql,
    types: ['mongodb', 'redis', 'valkey', 'keydb', 'dragonfly']
  }
];
