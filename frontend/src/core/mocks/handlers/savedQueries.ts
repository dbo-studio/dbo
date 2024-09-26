import { http, HttpResponse } from 'msw';

export const DELETE_SAVED_QUERY = (id: number) => `/saved/${id}`;

const savedQueriesHandler = [
  http.get('/api/saved', () => {
    return HttpResponse.json({
      data: [
        {
          id: 1,
          name: 'data_src',
          query: "SELECT * FROM 'data_src';"
        }
      ],
      message: ''
    });
  }),
  http.post('/api/saved', () => {
    return HttpResponse.json({
      data: {
        id: 1,
        name: 'data_src',
        query: "SELECT * FROM 'data_src';"
      },
      message: ''
    });
  }),
  http.patch('/api/saved/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      data: {
        id: Number(id),
        name: 'data_src',
        query: "SELECT * FROM 'data_src';"
      },
      message: ''
    });
  }),
  http.delete('/api/saved/:id', () => {
    return HttpResponse.json({
      data: '',
      message: ''
    });
  })
];

export { savedQueriesHandler };
