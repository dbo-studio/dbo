export type TreeNodeActionTypesType = 'form' | 'command' | 'action' | 'route' | 'tab';
export type FormFieldTypesType = 'text' | 'select' | 'multi-select' | 'checkbox' | 'query';

export type TreeNodeType = {
  id: string;
  name: string;
  type: string;
  icon?: string;
  hasChildren?: boolean;
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

export type ObjectTabType = {
  id: string;
  name: string;
};

export type FormFieldType = {
  id: string;
  name: string;
  type: FormFieldTypesType;
  required: boolean;
  options?: FormFieldOptionType[];
  dependsOn?: FieldDependencyType;
};

export type FormFieldWithState = FormFieldType & {
  value?: any;
  originalValue?: any;
  added?: boolean;
  deleted?: boolean;
  updated?: boolean;
};

export type FormFieldOptionType = {
  value: any;
  label: string;
};

export type FieldDependencyType = {
  fieldId: string;
  parameters?: Record<string, string>;
};
