export type TreeRequestType = {
  connectionId: number | string;
  parentId: string;
};

export type TreeResponseType = TreeNodeType;

export type GetObjectRequestType = {
  connectionId: string;
  action: string;
};

export type GetObjectDetailRequestType = {
  connectionId: string;
  nodeId: string;
  type: string;
};

export type TreeNodeType = {
  id: string;
  name: string;
  type: string;
  action: TreeNodeActionType;
  contextMenu: TreeNodeActionType[];
  children?: TreeNodeType[];
};

export type TreeNodeActionType = {
  title: string;
  name: string;
  type: TreeNodeActionTypesType;
  params: Record<string, any>;
};

export type TreeNodeActionTypesType = 'form' | 'command' | 'action' | 'route';

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
