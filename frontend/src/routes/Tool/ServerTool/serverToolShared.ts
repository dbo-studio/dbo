import type { SelectInputOption } from '@/components/base/SelectInput/types';

export type ServerToolProps = { connectionId: number };

export const SERVER_TOOL_MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
export const pickServerOption = (v: unknown): string => (v as SelectInputOption).value as string;
