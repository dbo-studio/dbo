export type TreeRequestType = {
  connection_id: number | string;
  parent_id: string;
};

export type TreeResponseType = TreeNodeType;

export type TreeNodeType = {
  id: string;
  name: string;
  type: string;
  actions: string[];
  children?: TreeNodeType[];
};

export type FormFieldType = {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'checkbox' | 'select' | 'array';
  required?: boolean;
  default?: string;
  options?: FormFieldOptionType[];
};

export type FormFieldOptionType = {
  value: string;
  name: string;
};

export type FormDataType = {
  [key: string]: any;
};

export type ModalActionType = {
  id: string;
  nodeId: string;
};
