import {
  FieldDependencyType,
  FormFieldOptionType,
  FormFieldTypesType,
  FormValue,
  ObjectTabType,
  TreeNodeType
} from '@/types/Tree';

export type TreeRequestType = {
  connectionId: number;
  parentId: string | null;
  fromCache?: boolean;
};

export type TreeResponseType = TreeNodeType;

export type TreeSearchRequestType = {
  connectionId: number;
  query: string;
  limit?: number;
};

export type TreeSearchResultType = {
  node: TreeNodeType;
  /** Ancestors from the root down to the node's parent; children are not included. */
  path: TreeNodeType[];
};

export type TreeSearchResponseType = {
  results: TreeSearchResultType[];
  truncated: boolean;
};

export type TabRequestType = {
  connectionId: number;
  action: string;
  nodeId: string;
};

export type TabResponseType = ObjectTabType[];

export type FormObjectResponseType = {
  general: GeneralFieldType[];
  schema: SchemaFieldType[];
  data: Record<string, FormValue>[];
};

export type DynamicFieldRequestType = {
  connectionId: number;
  nodeId: string;
  parameters: Record<string, unknown>;
};

export type DynamicFieldResponse = FormFieldOptionType[];

export type ObjectRequestType = {
  connectionId: number;
  nodeId: string;
  action: string;
  tabId: string;
};

export type SaveObjectRequestType = {
  connectionId: number;
  nodeId: string;
  action: string;
  data: Record<string, unknown>;
  confirmed?: boolean;
};

export type PreviewExecuteResponseType = {
  queries: string[];
};

export type ExecuteActionResponseType = {
  nodeId?: string;
  nextAction?: string;
};

type SchemaFieldType = {
  id: string;
  name: string;
  type: FormFieldTypesType;
  required: boolean;
  options?: FormFieldOptionType[];
  dependsOn?: FieldDependencyType;
};

type GeneralFieldType = {
  id: string;
  name: string;
  type: FormFieldTypesType;
  value: FormValue;
  required: boolean;
  options?: FormFieldOptionType[];
};
