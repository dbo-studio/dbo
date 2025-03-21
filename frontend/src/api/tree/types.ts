export type TreeRequestType = {
  connectionId: number;
  parentId: string | null;
};

export type TreeResponseType = TreeNodeType;

export type TabRequestType = {
  connectionId: number;
  action: string;
  nodeId: string;
};

export type TabResponseType = ObjectTabType[];

export type ObjectTabType = {
  id: string;
  name: string;
};

export type FieldRequestType = {
  connectionId: number;
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
  value?: any;
  originalValue?: any;
  fields?: FormFieldType[];
};

export type ObjectRequestType = {
  connectionId: number;
  nodeId: string;
  action: string;
  tabId: string;
};

export type SaveObjectRequestType = ObjectRequestType & {
  data: any;
};

export type TreeNodeType = {
  id: string;
  name: string;
  type: string;
  action: TreeNodeActionType;
  contextMenu: TreeNodeActionType[];
  children: TreeNodeType[];
};

export type TreeNodeActionType = {
  title: string;
  name: string;
  type: TreeNodeActionTypesType;
  params: Record<string, any>;
};

export type TreeNodeActionTypesType = 'form' | 'command' | 'action' | 'route' | 'tab';
