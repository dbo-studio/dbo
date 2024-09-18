import { http, HttpResponse } from 'msw';

// export const GET_CONNECTION_LIST = () => '/connections';
// export const GET_CONNECTION_DETAIL = (connectionID: string | number) => `/connections/${connectionID}`;
// export const CREATE_CONNECTION = () => '/connections';
// export const UPDATE_CONNECTION = (connectionID: string | number) => `/connections/${connectionID}`;
// export const DELETE_CONNECTION = (connectionID: string | number) => `/connections/${connectionID}`;
// export const TEST_CONNECTION = () => '/connections/test';

http.get('/connections', () => {
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
});
