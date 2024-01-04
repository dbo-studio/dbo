import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ConnectionStore } from './types';

type ConnectionState = ConnectionStore;

const c = {
  info: {
    driver: 'PostgreSQL',
    type: 'SQL',
    name: 'order-service'
  },
  auth: {
    database: 'default',
    host: 'localhost',
    port: 9041,
    passport: 'secret'
  },
  databases: [
    {
      name: 'default',
      schemes: [
        {
          name: 'public',
          tables: [
            {
              name: 'orders',
              dll: '',
              fields: []
            },
            {
              name: 'users',
              dll: '',
              fields: []
            },
            {
              name: 'products',
              dll: '',
              fields: []
            },
            {
              name: 'order_products',
              dll: '',
              fields: []
            },
            {
              name: 'transactions',
              dll: '',
              fields: []
            }
          ]
        }
      ]
    }
  ]
};

export const useConnectionStore = create<ConnectionState>()(
  devtools(
    persist(
      (set, get, ...state) => ({
        connections: [c],
        currentConnection: c,
        currentSchema: c.databases[0].schemes[0]
      }),
      { name: 'connections' }
    )
  )
);
