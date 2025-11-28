import { FormFieldOptionType, FormFieldType, ObjectTabType, TreeNodeType } from '@/types/Tree';

export type TreeRequestType = {
  connectionId: number;
  parentId: string | null;
  fromCache?: boolean;
};

export type TreeResponseType = TreeNodeType;

export type TabRequestType = {
  connectionId: number;
  action: string;
  nodeId: string;
};

export type TabResponseType = ObjectTabType[];

export type SchemaRequestType = {
  connectionId: number;
  action: string;
  nodeId: string;
  tabId: string;
};

export type FormSchemaResponseType = FormFieldType[];

export type FormObjectResponseType = {
  isArray: boolean;
  schema: FormFieldType[];
  data: Record<string, any>[];
};

export type DynamicFieldRequestType = {
  connectionId: number;
  nodeId: string;
  parameters: Record<string, any>;
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
  data: Record<string, any>;
};
