import { http, HttpResponse } from 'msw';

const queriesHandler = [
  http.post('/api/query/run', () => {
    return HttpResponse.json({
      data: {
        query: 'SELECT * FROM "data_src" LIMIT 100 OFFSET 0;',
        data: [
          {
            authors: 'G.V. Mann',
            datasrc_id: 'D1066 ',
            dbo_index: 0,
            end_page: '76',
            issue_state: '',
            journal: 'American Journal of Clinical Nutrition',
            start_page: '31',
            title: 'The Health and Nutritional status of Alaskan Eskimos.',
            vol_city: '11',
            year: 1962
          },
          {
            authors: 'J.P. McBride, R.A. Maclead',
            datasrc_id: 'D1073 ',
            dbo_index: 1,
            end_page: '638',
            issue_state: '',
            journal: 'Journal of the American Dietetic Association',
            start_page: '636',
            title: 'Sodium and potassium in fish from the Canadian Pacific coast.',
            vol_city: '32',
            year: 1956
          },
          {
            authors: 'M.E. Stansby',
            datasrc_id: 'D1107 ',
            dbo_index: 2,
            end_page: '11',
            issue_state: '9',
            journal: 'Marine Fish Rev.',
            start_page: '1',
            title: 'Chemical Characteristics of fish caught in the northwest Pacific Oceans.',
            vol_city: '38',
            year: 1976
          }
        ],
        structures: [
          {
            name: 'datasrc_id',
            type: 'character',
            not_null: false,
            length: 6,
            default: null,
            comment: null,
            mapped_type: 'string',
            editable: true,
            is_active: true
          },
          {
            name: 'authors',
            type: 'text',
            not_null: true,
            length: null,
            default: null,
            comment: null,
            mapped_type: 'string',
            editable: true,
            is_active: true
          },
          {
            name: 'title',
            type: 'text',
            not_null: false,
            length: null,
            default: null,
            comment: null,
            mapped_type: 'string',
            editable: true,
            is_active: true
          },
          {
            name: 'year',
            type: 'integer',
            not_null: true,
            length: null,
            default: null,
            comment: null,
            mapped_type: 'string',
            editable: true,
            is_active: true
          },
          {
            name: 'journal',
            type: 'text',
            not_null: true,
            length: null,
            default: null,
            comment: null,
            mapped_type: 'string',
            editable: true,
            is_active: true
          },
          {
            name: 'vol_city',
            type: 'text',
            not_null: true,
            length: null,
            default: null,
            comment: null,
            mapped_type: 'string',
            editable: true,
            is_active: true
          },
          {
            name: 'issue_state',
            type: 'text',
            not_null: true,
            length: null,
            default: null,
            comment: null,
            mapped_type: 'string',
            editable: true,
            is_active: true
          },
          {
            name: 'start_page',
            type: 'text',
            not_null: true,
            length: null,
            default: null,
            comment: null,
            mapped_type: 'string',
            editable: true,
            is_active: true
          },
          {
            name: 'end_page',
            type: 'text',
            not_null: true,
            length: null,
            default: null,
            comment: null,
            mapped_type: 'string',
            editable: true,
            is_active: true
          }
        ]
      },
      message: ''
    });
  }),
  http.post('/api/query/update', () => {
    return HttpResponse.json({
      data: {
        Query: ['DELETE FROM "public"."weight" WHERE "msre_desc" = \'stick\''],
        RowsAffected: 31
      },
      message: ''
    });
  }),
  http.post('/api/query/raw', () => {
    return HttpResponse.json({
      data: {
        query: 'select * from data_src limit 1',
        data: [
          {
            Duration: '0',
            Message: 'connection error',
            Query: 'select * from data_src limit 1'
          }
        ],
        structures: [
          {
            name: 'Query',
            type: 'Varchar',
            not_null: false,
            length: null,
            default: null,
            comment: null,
            mapped_type: 'string',
            editable: false,
            is_active: true
          },
          {
            name: 'Message',
            type: 'Varchar',
            not_null: false,
            length: null,
            default: null,
            comment: null,
            mapped_type: 'string',
            editable: false,
            is_active: true
          },
          {
            name: 'Time',
            type: 'Varchar',
            not_null: false,
            length: null,
            default: null,
            comment: null,
            mapped_type: 'string',
            editable: false,
            is_active: true
          }
        ]
      },
      message: ''
    });
  }),
  http.get('/api/query/autocomplete', () => {
    return HttpResponse.json({
      data: {
        databases: ['postgres', 'default', 'template1', 'template0'],
        views: null,
        schemas: ['public', 'pg_catalog', 'pg_toast'],
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
        ],
        columns: {
          data_src: [
            'datasrc_id',
            'authors',
            'title',
            'year',
            'journal',
            'vol_city',
            'issue_state',
            'start_page',
            'end_page'
          ],
          datsrcln: ['ndb_no', 'nutr_no', 'datasrc_id'],
          deriv_cd: ['deriv_cd', 'derivcd_desc'],
          fd_group: ['fdgrp_cd', 'fddrp_desc'],
          food_des: [
            'ndb_no',
            'fdgrp_cd',
            'long_desc',
            'shrt_desc',
            'comname',
            'manufacname',
            'survey',
            'ref_desc',
            'refuse',
            'sciname',
            'n_factor',
            'pro_factor',
            'fat_factor',
            'cho_factor'
          ],
          footnote: ['ndb_no', 'footnt_no', 'footnt_typ', 'nutr_no', 'footnt_txt'],
          nut_data: [
            'ndb_no',
            'nutr_no',
            'nutr_val',
            'num_data_pts',
            'std_error',
            'src_cd',
            'deriv_cd',
            'ref_ndb_no',
            'add_nutr_mark',
            'num_studies',
            'min',
            'max',
            'df',
            'low_eb',
            'up_eb',
            'stat_cmt',
            'cc'
          ],
          nutr_def: ['nutr_no', 'units', 'tagname', 'nutrdesc', 'num_dec', 'sr_order'],
          src_cd: ['src_cd', 'srccd_desc'],
          weight: ['ndb_no', 'seq', 'amount', 'msre_desc', 'gm_wgt', 'num_data_pts', 'std_dev']
        }
      },
      message: ''
    });
  })
];

export { queriesHandler };
