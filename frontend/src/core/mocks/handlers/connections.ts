import { http, HttpResponse } from 'msw';

const connectionHandler = [
  http.get('/api/connections', () => {
    return HttpResponse.json({
      data: [
        connectionListItemModel,
        {
          ...connectionListItemModel,
          id: 2,
          is_active: false
        }
      ],
      message: ''
    });
  }),

  http.get('/api/connections/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      data: {
        ...connectionDetailModel,
        id: Number(id)
      },
      message: ''
    });
  }),

  http.post('/api/connections', () => {
    return HttpResponse.json({
      data: connectionDetailModel,
      message: ''
    });
  }),

  http.patch('/api/connections/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      data: {
        ...connectionDetailModel,
        id: Number(id)
      },
      message: ''
    });
  }),

  http.delete('/api/connections/:id', () => {
    return HttpResponse.json({
      data: [connectionListItemModel],
      message: ''
    });
  }),

  http.post('/api/connections/test', () => {
    return HttpResponse.json({
      data: '',
      message: ''
    });
  })
];

const connectionListItemModel = {
  id: 1,
  name: 'localhost',
  type: 'SQL',
  driver: 'PostgreSQL',
  auth: {
    database: 'default',
    host: 'sample-pgsql',
    port: 5432,
    username: 'default'
  },
  is_active: true
};

const connectionDetailModel = {
  id: 1,
  name: 'sample_db',
  type: 'SQL',
  driver: 'PostgreSQL',
  version: '16.1',
  is_active: true,
  current_database: 'default',
  current_schema: 'public',
  auth: {
    database: 'default',
    host: 'sample-pgsql',
    port: 5432,
    username: 'default'
  },
  databases: ['postgres', 'default'],
  schemas: ['public', 'test1', 'test2'],
  tables: [
    'data_src',
    'datsrcln',
    'deriv_cd',
    'fd_group',
    'food_des',
    'footnote',
    'nut_data',
    'nutr_def',
    'src_cd',
    'weight'
  ]
};

export { connectionDetailModel, connectionHandler, connectionListItemModel };
