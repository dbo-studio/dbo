import { http, HttpResponse } from 'msw';

const historiesHandler = [
  http.get('/api/histories', () => {
    return HttpResponse.json({
      data: [
        {
          id: 1,
          connectionId: 1,
          query: 'SELECT * FROM "data_src" LIMIT 100 OFFSET 0;',
          created_at: '2024-09-18 13:57:26'
        }
      ],
      message: ''
    });
  })
];

export { historiesHandler };
