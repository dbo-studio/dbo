import { faker } from '@faker-js/faker';
import { http, HttpResponse } from 'msw';

const queriesHandler = [
  http.post('/api/query/run', async () => {
    return HttpResponse.json({
      data: structureModel,
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
      data: structureModel,
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

const generateFakeJson = () => {
  return JSON.stringify({
    id: faker.number.int(),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email()
  });
};

const queryModel = [];
for (let i = 0; i < 3; i++) {
  queryModel.push({
    authors: faker.person.fullName(),
    datasrc_id: faker.number.int(),
    dbo_index: i,
    end_page: faker.number.int({ min: 0, max: 100 }),
    issue_state: '',
    journal: faker.lorem.text(),
    start_page: '31',
    title: generateFakeJson(),
    vol_city: faker.number.int({ min: 0, max: 100 }),
    year: faker.date.birthdate().getFullYear()
  });
}

const structureModel = {
  query: 'SELECT * FROM "data_src" LIMIT 100 OFFSET 0;',
  data: queryModel,
  structures: [
    {
      name: 'datasrc_id',
      type: 'character varying',
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
      type: 'int2',
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
};

export { queriesHandler, structureModel, queryModel };
