import { FormFieldOptionType, FormFieldType, FormValue, ObjectTabType, TreeNodeType } from '@/types/Tree';

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

export type FormObjectResponseType = {
  isArray: boolean;
  schema: FormFieldType[];
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
  data: Record<string, FormValue>;
};
