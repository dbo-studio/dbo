import { StructureType } from '@/src/types/Data';

export const fakeColumn: StructureType[] = [
  {
    name: 'id',
    type: 'varchar',
    notNull: false,
    length: 255,
    decimal: 0,
    default: "nextval('cargo_addons_id_seq'::regclass)"
  },
  {
    name: 'first_name',
    type: 'varchar',
    notNull: true,
    length: 255,
    decimal: 0,
    default: ''
  },
  {
    name: 'last_name',
    type: 'varchar(255)',
    notNull: true,
    length: 255,
    decimal: 0,
    default: ''
  },
  {
    name: 'age',
    type: 'int8',
    notNull: true,
    length: 64,
    decimal: 0,
    default: ''
  },
  {
    name: 'visits',
    type: 'int8',
    notNull: true,
    length: 64,
    decimal: 0,
    default: ''
  },
  {
    name: 'country',
    type: 'varchar(255)',
    notNull: true,
    length: 255,
    decimal: 0,
    default: ''
  },
  {
    name: 'created_at',
    type: 'timestamp',
    notNull: true,
    length: 0,
    decimal: 0,
    default: ''
  },
  {
    name: 'updated_at',
    type: 'timestamp',
    notNull: true,
    length: 0,
    decimal: 0,
    default: ''
  }
];

export const fakeStructureTypes = (): string[] => {
  return ['int8', 'bigserial', 'bit', 'bool', 'varchar', 'json', 'xml', 'uuid', 'line'];
};
