export const fakeColumn: any[] = [
  {
    felid: 'id',
    type: 'varchar',
    isNull: false,
    length: 255,
    decimal: 0,
    default: "nextval('cargo_addons_id_seq'::regclass)"
  },
  {
    felid: 'first_name',
    type: 'varchar',
    isNull: true,
    length: 255,
    decimal: 0,
    default: ''
  },
  {
    felid: 'last_name',
    type: 'varchar(255)',
    isNull: true,
    length: 255,
    decimal: 0,
    default: ''
  },
  {
    felid: 'age',
    type: 'int8',
    isNull: true,
    length: 64,
    decimal: 0,
    default: ''
  },
  {
    felid: 'visits',
    type: 'int8',
    isNull: true,
    length: 64,
    decimal: 0,
    default: ''
  },
  {
    felid: 'country',
    type: 'varchar(255)',
    isNull: true,
    length: 255,
    decimal: 0,
    default: ''
  },
  {
    felid: 'created_at',
    type: 'timestamp',
    isNull: true,
    length: 0,
    decimal: 0,
    default: ''
  },
  {
    felid: 'updated_at',
    type: 'timestamp',
    isNull: true,
    length: 0,
    decimal: 0,
    default: ''
  }
];
