export interface ConnectionType {
  id: number;
  name: string;
  type: 'postgresql' | 'sqlite';
  isActive: boolean;
  info: string;
  icon: string;
  options: Record<string, string | number | boolean>;
}
