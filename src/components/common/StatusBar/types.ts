import { IconTypes } from "../../base/CustomIcon/types";

export type StatusBarTabTypes = {
  id: number;
  name: string;
  icon: keyof typeof IconTypes;
  iconActive: keyof typeof IconTypes;
  content: any;
};