export interface ConnectionType {
  id: number;
  name: string;
  type: 'postgresql';
  isActive: boolean;
  info: string;
  icon: string;
  options: any;
}
