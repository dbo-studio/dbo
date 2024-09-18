import { http, HttpResponse } from 'msw';

const connectionHandler = [
  http.get('/api/connections', () => {
    return HttpResponse.json({
      data: [
        {
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
        },
        {
          id: 2,
          name: 'online',
          type: 'SQL',
          driver: 'PostgreSQL',
          auth: {
            database: 'default',
            host: 'sample-pgsql',
            port: 5432,
            username: 'default'
          },
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
        id: id,
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
        schemas: ['public'],
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
      },
      message: ''
    });
  }),

  http.post('/api/connections', () => {
    return HttpResponse.json({
      data: {
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
        schemas: ['public'],
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
      },
      message: ''
    });
  }),

  http.patch('/api/connections/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      data: {
        id: id,
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
        schemas: ['public'],
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
      },
      message: ''
    });
  }),

  http.delete('/api/connections/:id', () => {
    return HttpResponse.json({
      data: [
        {
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
        }
      ],
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

export { connectionHandler };
