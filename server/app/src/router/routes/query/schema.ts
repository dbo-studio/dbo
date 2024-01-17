import { t } from 'elysia';

const filterSchema = t.Object({
  column: t.String(),
  operator: t.String(),
  value: t.String()
});

const sortSchema = t.Object({
  column: t.String(),
  operator: t.String()
});

const querySchema = {
  body: t.Object({
    table: t.String(),
    columns: t.Optional(t.Array(t.String())),
    filters: t.Optional(t.Array(filterSchema)),
    sorts: t.Optional(t.Array(sortSchema))
  })
};

export { querySchema };
