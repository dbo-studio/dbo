import { faker } from "@faker-js/faker";

const fakeColumn: ServerColumn[] = [
  {
    felid: "id",
    type: "string",
  },
  {
    felid: "first_name",
    type: "string",
  },
  {
    felid: "last_name",
    type: "string",
  },
  {
    felid: "age",
    type: "number",
  },
  {
    felid: "visits",
    type: "number",
  },
  {
    felid: "country",
    type: "string",
  },
  {
    felid: "created_at",
    type: "date",
  },
  {
    felid: "updated_at",
    type: "date",
  },
];

function fakeRow(): any {
  return {
    id: faker.number.int(),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    age: faker.number.int(40),
    visits: faker.number.int(1000),
    country: faker.location.city(),
    created_at: "2022-04-23 10:23:20",
    updated_at: "2022-04-23 10:23:20",
  };
}

export function makeData(len: number): ServerData {
  const arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(fakeRow());
  }

  return {
    columns: fakeColumn,
    rows: arr,
  };
}
