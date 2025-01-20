import { http, HttpResponse } from 'msw';

const databasesHandler = [
  http.post('/api/databases', async () => {
    return HttpResponse.json({
      data: {},
      message: ''
    });
  }),

  http.delete('/api/databases', () => {
    return HttpResponse.json({
      data: '',
      message: ''
    });
  }),

  http.get('/api/databases/metadata', async () => {
    return HttpResponse.json({
      data: {
        templates: ['postgres', 'default', 'template1', 'template0'],
        table_spaces: ['pg_default', 'pg_global'],
        encodings: [
          'BIG5',
          'EUC_CN',
          'EUC_JP',
          'EUC_JIS_2004',
          'EUC_KR',
          'EUC_TW',
          'GB18030',
          'GBK',
          'ISO_8859_1',
          'ISO_8859_2',
          'ISO_8859_3',
          'ISO_8859_4',
          'ISO_8859_5',
          'ISO_8859_6',
          'ISO_8859_7',
          'ISO_8859_8',
          'ISO_8859_9',
          'ISO_8859_10',
          'ISO_8859_13',
          'ISO_8859_14',
          'ISO_8859_15',
          'ISO_8859_16',
          'JOHAB',
          'KOI8R',
          'KOI8U',
          'LATIN1',
          'LATIN2',
          'LATIN3',
          'LATIN4',
          'LATIN5',
          'LATIN6',
          'LATIN7',
          'LATIN8',
          'LATIN9',
          'LATIN10',
          'MULE_INTERNAL',
          'SJIS',
          'SHIFT_JIS_2004',
          'SQL_ASCII',
          'UHC',
          'UTF8',
          'WIN866',
          'WIN874',
          'WIN1250',
          'WIN1251',
          'WIN1252',
          'WIN1253',
          'WIN1254',
          'WIN1255',
          'WIN1256',
          'WIN1257',
          'WIN1258'
        ],
        data_types: [
          'bigserial',
          'bit',
          'bool',
          'box',
          'bytea',
          'char',
          'cidr',
          'circle',
          'date',
          'decimal',
          'float4',
          'float8',
          'inet',
          'int2',
          'int4',
          'int8',
          'interval',
          'json',
          'jsonb',
          'line',
          'lseg',
          'macaddr',
          'money',
          'numeric',
          'path',
          'point',
          'polygon',
          'serial',
          'serial2',
          'serial4',
          'serial8',
          'smallserial',
          'text',
          'time',
          'timestamp',
          'timestamptz',
          'timetz',
          'tsquery',
          'tsvector',
          'txid_snapshot',
          'uuid',
          'varbit',
          'xml',
          'character varying'
        ]
      },
      message: ''
    });
  })
];

export { databasesHandler };
