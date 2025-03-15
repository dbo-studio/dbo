export type TreeRequestType = {
  connectionId: number | string;
  parentId: string;
};

export type TreeResponseType = TreeNodeType;

export type TabRequestType = {
  connectionId: number | string;
  action: string;
  nodeId: string;
};

export type TabResponseType = ObjectTabType[];

export type ObjectTabType = {
  id: string;
  name: string;
};

export type FieldRequestType = {
  connectionId: string;
  action: string;
  nodeId: string;
  tabId: string;
};

export type FieldResponseType = FormFieldType[];

export type FormFieldType = {
  id: string;
  name: string;
  type: string;
  required: boolean;
  options?: FieldOptionType[];
};

export type FieldOptionType = {
  id: string;
  name: string;
  value: string;
  type?: string;
};

export type ObjectRequestType = {
  connectionId: string;
  nodeId: string;
  action: string;
  tabId: string;
};

export type ObjectResponseType = Record<string, any>;

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

export type TreeNodeActionTypesType = 'form' | 'command' | 'action' | 'route' | 'tab';
