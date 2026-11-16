import locales from '@/locales';

const text = locales as Record<string, string>;
const id = (key: string): string => key.replace('.', '_');

/** Display text for a permission key from the backend's catalog (key `backup.restore` -> `perm_backup_restore`). */
export const permissionLabel = (key: string): string => text[`perm_${id(key)}`] ?? key;
export const permissionHint = (key: string): string | undefined => text[`perm_${id(key)}_hint`];
export const permissionGroupLabel = (group: string): string => text[`perm_group_${group}`] ?? group;
