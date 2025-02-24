import { http, HttpResponse } from 'msw';

const objectsHandler = [
  http.get('/api/objects', () => {
    return HttpResponse.json({
      data: objectResponse,
      message: ''
    });
  })
];

export { objectsHandler };

const objectResponse = {
  id: 'root',
  name: 'PostgreSQL Server',
  type: 'server',
  children: [
    {
      id: 'postgres',
      name: 'postgres',
      type: 'database',
      children: [],
      actions: ['create_schema', 'create_table', 'create_view', 'drop_database']
    },
    {
      id: 'default',
      name: 'default',
      type: 'database',
      children: [
        {
          id: 'default.public',
          name: 'public',
          type: 'schema',
          children: [
            {
              id: 'default.public.tables',
              name: 'Tables',
              type: 'table_container',
              children: [
                {
                  id: 'default.public.data_src',
                  name: 'data_src',
                  type: 'table',
                  children: [],
                  actions: ['edit_table', 'drop_table', 'copy_name']
                },
                {
                  id: 'default.public.datsrcln',
                  name: 'datsrcln',
                  type: 'table',
                  children: [],
                  actions: ['edit_table', 'drop_table', 'copy_name']
                },
                {
                  id: 'default.public.deriv_cd',
                  name: 'deriv_cd',
                  type: 'table',
                  children: [],
                  actions: ['edit_table', 'drop_table', 'copy_name']
                },
                {
                  id: 'default.public.fd_group',
                  name: 'fd_group',
                  type: 'table',
                  children: [],
                  actions: ['edit_table', 'drop_table', 'copy_name']
                },
                {
                  id: 'default.public.food_des',
                  name: 'food_des',
                  type: 'table',
                  children: [],
                  actions: ['edit_table', 'drop_table', 'copy_name']
                },
                {
                  id: 'default.public.footnote',
                  name: 'footnote',
                  type: 'table',
                  children: [],
                  actions: ['edit_table', 'drop_table', 'copy_name']
                },
                {
                  id: 'default.public.nut_data',
                  name: 'nut_data',
                  type: 'table',
                  children: [],
                  actions: ['edit_table', 'drop_table', 'copy_name']
                },
                {
                  id: 'default.public.nutr_def',
                  name: 'nutr_def',
                  type: 'table',
                  children: [],
                  actions: ['edit_table', 'drop_table', 'copy_name']
                },
                {
                  id: 'default.public.src_cd',
                  name: 'src_cd',
                  type: 'table',
                  children: [],
                  actions: ['edit_table', 'drop_table', 'copy_name']
                },
                {
                  id: 'default.public.weight',
                  name: 'weight',
                  type: 'table',
                  children: [],
                  actions: ['edit_table', 'drop_table', 'copy_name']
                }
              ],
              actions: ['create_table']
            },
            {
              id: 'default.public.views',
              name: 'Views',
              type: 'view_container',
              children: [
                {
                  id: 'default.public.test_view',
                  name: 'test_view',
                  type: 'view',
                  children: [],
                  actions: ['edit_view', 'drop_view']
                }
              ],
              actions: ['create_view']
            },
            {
              id: 'default.public.materialized_views',
              name: 'Materialized Views',
              type: 'materialized_view_container',
              children: [],
              actions: ['create_materialized_view']
            },
            {
              id: 'default.public.indexes',
              name: 'Indexes',
              type: 'index_container',
              children: [
                {
                  id: 'default.public.data_src_pkey',
                  name: 'data_src_pkey',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.datsrcln_pkey',
                  name: 'datsrcln_pkey',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.deriv_cd_pkey',
                  name: 'deriv_cd_pkey',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.food_des_pkey',
                  name: 'food_des_pkey',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.nut_data_pkey',
                  name: 'nut_data_pkey',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.nutr_def_pkey',
                  name: 'nutr_def_pkey',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.src_cd_pkey',
                  name: 'src_cd_pkey',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.weight_pkey',
                  name: 'weight_pkey',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.datsrcln_datasrc_id_idx',
                  name: 'datsrcln_datasrc_id_idx',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.food_des_fdgrp_cd_idx',
                  name: 'food_des_fdgrp_cd_idx',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.footnote_ndb_no_idx',
                  name: 'footnote_ndb_no_idx',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.nut_data_deriv_cd_idx',
                  name: 'nut_data_deriv_cd_idx',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.nut_data_nutr_no_idx',
                  name: 'nut_data_nutr_no_idx',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.nut_data_src_cd_idx',
                  name: 'nut_data_src_cd_idx',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                },
                {
                  id: 'default.public.fd_group_pkey',
                  name: 'fd_group_pkey',
                  type: 'index',
                  children: [],
                  actions: ['edit_index', 'drop_index']
                }
              ],
              actions: ['create_index']
            },
            {
              id: 'default.public.sequences',
              name: 'Sequences',
              type: 'sequence_container',
              children: [],
              actions: ['create_sequence']
            }
          ],
          actions: [
            'create_table',
            'create_view',
            'create_materialized_view',
            'create_index',
            'create_sequence',
            'drop_schema'
          ]
        },
        {
          id: 'default.test_schema',
          name: 'test_schema',
          type: 'schema',
          children: [
            {
              id: 'default.test_schema.tables',
              name: 'Tables',
              type: 'table_container',
              children: [
                {
                  id: 'default.test_schema.test_table',
                  name: 'test_table',
                  type: 'table',
                  children: [],
                  actions: ['edit_table', 'drop_table', 'copy_name']
                }
              ],
              actions: ['create_table']
            },
            {
              id: 'default.test_schema.views',
              name: 'Views',
              type: 'view_container',
              children: [],
              actions: ['create_view']
            },
            {
              id: 'default.test_schema.materialized_views',
              name: 'Materialized Views',
              type: 'materialized_view_container',
              children: [],
              actions: ['create_materialized_view']
            },
            {
              id: 'default.test_schema.indexes',
              name: 'Indexes',
              type: 'index_container',
              children: [],
              actions: ['create_index']
            },
            {
              id: 'default.test_schema.sequences',
              name: 'Sequences',
              type: 'sequence_container',
              children: [],
              actions: ['create_sequence']
            }
          ],
          actions: [
            'create_table',
            'create_view',
            'create_materialized_view',
            'create_index',
            'create_sequence',
            'drop_schema'
          ]
        },
        {
          id: 'default.pg_toast',
          name: 'pg_toast',
          type: 'schema',
          children: [
            {
              id: 'default.pg_toast.tables',
              name: 'Tables',
              type: 'table_container',
              children: [
                {
                  id: 'default.pg_toast.',
                  name: '',
                  type: 'table',
                  children: [],
                  actions: ['edit_table', 'drop_table', 'copy_name']
                }
              ],
              actions: ['create_table']
            },
            {
              id: 'default.pg_toast.views',
              name: 'Views',
              type: 'view_container',
              children: [],
              actions: ['create_view']
            },
            {
              id: 'default.pg_toast.materialized_views',
              name: 'Materialized Views',
              type: 'materialized_view_container',
              children: [],
              actions: ['create_materialized_view']
            },
            {
              id: 'default.pg_toast.indexes',
              name: 'Indexes',
              type: 'index_container',
              children: [],
              actions: ['create_index']
            },
            {
              id: 'default.pg_toast.sequences',
              name: 'Sequences',
              type: 'sequence_container',
              children: [],
              actions: ['create_sequence']
            }
          ],
          actions: [
            'create_table',
            'create_view',
            'create_materialized_view',
            'create_index',
            'create_sequence',
            'drop_schema'
          ]
        }
      ],
      actions: ['create_schema', 'create_table', 'create_view', 'drop_database']
    }
  ],
  actions: ['create_database']
};
