import { ConnectionType, SchemaType } from '@/src/types';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ConnectionStore } from './types';

type ConnectionState = ConnectionStore;

// const c = {
//   driver: 'PostgreSQL',
//   type: 'SQL',
//   name: 'order-service',
//   auth: {
//     database: 'default',
//     host: 'localhost',
//     port: 9041,
//     passport: 'secret'
//   },
//   databases: [
//     {
//       name: 'default',
//       schemes: [
//         {
//           name: 'public',
//           tables: [
//             {
//               name: 'orders',
//               dll: '',
//               fields: []
//             },
//             {
//               name: 'users',
//               dll: '',
//               fields: []
//             },
//             {
//               name: 'products',
//               dll: '',
//               fields: []
//             },
//             {
//               name: 'order_products',
//               dll: '',
//               fields: []
//             },
//             {
//               name: 'transactions',
//               dll: '',
//               fields: []
//             }
//           ]
//         }
//       ]
//     }
//   ]
// };

export const useConnectionStore = create<ConnectionState>()(
  devtools(
    persist(
      (set, get) => ({
        showAddConnection: false,
        connections: undefined,
        currentConnection: undefined,
        currentSchema: {},
        getCurrentSchema: () => {
          const currentConnection = get().currentConnection;
          const currentSchema = get().currentSchema;
          if (!currentConnection || !currentSchema.hasOwnProperty(currentConnection.id)) {
            return undefined;
          }
          return currentSchema[currentConnection.id];
        },
        updateConnections: (connections: ConnectionType[]) => {
          set({ connections });
        },
        updateShowAddConnection: (show: boolean) => {
          set({ showAddConnection: show });
        },
        updateCurrentSchema: (currentSchema: SchemaType) => {
          const currentConnection = get().currentConnection;
          if (!currentConnection) {
            return;
          }
          const schemes = get().currentSchema;
          schemes[currentConnection.id] = currentSchema;
          set({ currentSchema: schemes });
        },
        updateCurrentConnection: (currentConnection: ConnectionType) => {
          set({ currentConnection });
        }
      }),
      { name: 'connections' }
    )
  )
);
