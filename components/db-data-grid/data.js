export const nodes1 = [
  {
    id: 1,
    name: "Operating System",
    deadline: new Date(2020, 1, 15),
    type: "SETUP",
    isComplete: true,
  },
  {
    id: 2,
    name: "VSCode",
    deadline: new Date(2020, 1, 17),
    type: "SETUP",
    isComplete: true,
  },
  {
    id: 3,
    name: "JavaScript",
    deadline: new Date(2020, 2, 28),
    type: "LEARN",
    isComplete: true,
  },
  {
    id: 4,
    name: "React",
    deadline: new Date(2020, 3, 8),
    type: "LEARN",
    isComplete: false,
  },
  {
    id: 5,
    name: "Git",
    deadline: new Date(2020, 4, 28),
    type: "SETUP",
    isComplete: false,
  },
  {
    id: "5",
    name: "Node",
    deadline: new Date(2020, 5, 18),
    type: "LEARN",
    isComplete: true,
  },
  {
    id: "6",
    name: "GraphQL",
    deadline: new Date(2020, 6, 30),
    type: "LEARN",
    isComplete: false,
  },
];

export const nodes = [
  {
    id: "1",
    fields: {
      name: {
        type: "string",
        value: 1,
      },
      deadline: {
        type: "date",
        value: new Date(2020, 1, 15),
      },
      type: {
        type: "string",
        value: "test1",
        options: ["test1", "test2", "test3"],
      },
      isComplete: {
        type: "number",
        value: 1,
      },
    },
  },
  {
    id: "2",
    fields: {
      name: {
        type: "string",
        value: 1,
      },
      deadline: {
        type: "date",
        value: new Date(2020, 1, 15),
      },
      type: {
        type: "string",
        value: "test1",
        options: ["test1", "test2", "test3"],
      },
      isComplete: {
        type: "number",
        value: 1,
      },
    },
  },

  {
    id: "3",
    fields: {
      name: {
        type: "string",
        value: 1,
      },
      deadline: {
        type: "date",
        value: new Date(2020, 1, 15),
      },
      type: {
        type: "string",
        value: "test1",
        options: ["test1", "test2", "test3"],
      },
      isComplete: {
        type: "number",
        value: 1,
      },
    },
  },

  {
    id: "4",
    fields: {
      name: {
        type: "string",
        value: 1,
      },
      deadline: {
        type: "date",
        value: new Date(2020, 1, 15),
      },
      type: {
        type: "string",
        value: "test1",
        options: ["test1", "test2", "test3"],
      },
      isComplete: {
        type: "number",
        value: 1,
      },
    },
  },
];
