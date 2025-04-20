import type { ConnectionType } from '@/types';
import { http, HttpResponse } from 'msw';

const connectionHandler = [
  http.get('/api/connections', async () => {
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

  http.get('/api/connections/:id', async ({ params }) => {
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
  name: 'dmt',
  isActive: true,
  info: 'dmt | postgresql 15.8 :  SQL Query',
  icon: 'postgresql',
  type: 'postgresql',
  options: {
    database: 'shopping_order',
    host: 'postgres.domestic-mock-server.orb.local',
    password: '',
    port: 5432,
    uri: '',
    username: 'default'
  }
};

const connectionDetailModel = {
  id: 1,
  name: 'dmt',
  isActive: true,
  info: 'dmt | postgresql 15.8 :  SQL Query',
  icon: 'postgresql',
  type: 'postgresql',
  options: {
    database: 'shopping_order',
    host: 'postgres.domestic-mock-server.orb.local',
    password: '',
    port: 5432,
    uri: '',
    username: 'default'
  }
} as ConnectionType;

export { connectionDetailModel, connectionHandler, connectionListItemModel };
