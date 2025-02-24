export type ObjectResponseType = TreeNode[];

export interface TreeNode {
  id: string;
  name: string;
  type: string;
  actions: string[];
  children?: TreeNode[];
}

export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'checkbox' | 'select' | 'array';
  required?: boolean;
  default?: string;
  options?: FormFieldOption[];
}

export interface FormFieldOption {
  value: string;
  name: string;
}

export interface FormData {
  [key: string]: any;
}

export interface ModalAction {
  id: string;
  nodeId: string;
}
