import type { IconTypes } from '@/components/base/CustomIcon/types';
import locales from '@/locales';

export type SettingsNavGroup = 'prefs' | 'workspace';

export type SettingsSectionDef = {
  id: number;
  name: string;
  description?: string;
  icon: keyof typeof IconTypes;
  keywords: string[];
  group: SettingsNavGroup;
  /** Admin-only section (e.g. Administration). */
  adminOnly?: boolean;
};

export type SettingsEntryDef = {
  id: string;
  sectionId: number;
  label: string;
  keywords: string[];
};

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  {
    id: 0,
    name: locales.general,
    icon: 'settings',
    keywords: ['general', 'debug', 'analytics', 'logs', 'update', 'version', 'session', 'auth', 'timeout'],
    group: 'prefs'
  },
  {
    id: 1,
    name: locales.appearance,
    description: locales.appearance_description,
    icon: 'theme',
    keywords: ['appearance', 'theme', 'font', 'dark', 'light', 'editor', 'menlo', 'color'],
    group: 'prefs'
  },
  {
    id: 2,
    name: locales.shortcuts,
    icon: 'shortcuts',
    keywords: ['shortcuts', 'keyboard', 'hotkey', 'keybind'],
    group: 'prefs'
  },
  {
    id: 3,
    name: locales.ai_settings,
    description: locales.ai_settings_description,
    icon: 'bot',
    keywords: ['ai', 'mcp', 'provider', 'openai', 'assistant', 'model'],
    group: 'prefs'
  },
  {
    id: 4,
    name: locales.security,
    description: locales.security_description,
    icon: 'lock',
    keywords: ['security', 'safe mode', 'password', 'biometric'],
    group: 'prefs'
  },
  {
    id: 5,
    name: locales.about,
    icon: 'about',
    keywords: ['about', 'version', 'license', 'docs'],
    group: 'prefs'
  },
  {
    id: 6,
    name: locales.administration,
    description: locales.administration_description,
    icon: 'user',
    keywords: ['administration', 'admin', 'users', 'members', 'invite'],
    group: 'workspace',
    adminOnly: true
  }
];

export const SETTINGS_ENTRIES: SettingsEntryDef[] = [
  {
    id: 'general.session',
    sectionId: 0,
    label: locales.auth_session,
    keywords: ['session', 'timeout', 'auth', 'idle', 'logout']
  },
  {
    id: 'general.updates',
    sectionId: 0,
    label: locales.check_for_updates,
    keywords: ['update', 'version', 'release']
  },
  {
    id: 'general.analytics',
    sectionId: 0,
    label: locales.analytics,
    keywords: ['analytics', 'telemetry']
  },
  {
    id: 'general.debug',
    sectionId: 0,
    label: locales.debug_mode,
    keywords: ['debug', 'console']
  },
  {
    id: 'general.logs',
    sectionId: 0,
    label: locales.show_logs,
    keywords: ['logs', 'log']
  },
  {
    id: 'general.reset',
    sectionId: 0,
    label: locales.reset_factory,
    keywords: ['reset', 'factory', 'clear']
  },
  {
    id: 'appearance.theme',
    sectionId: 1,
    label: locales.application_theme,
    keywords: ['theme', 'dark', 'light']
  },
  {
    id: 'appearance.font',
    sectionId: 1,
    label: locales.application_font,
    keywords: ['font', 'menlo', 'typeface']
  },
  {
    id: 'appearance.editor',
    sectionId: 1,
    label: locales.editor_theme,
    keywords: ['editor', 'theme', 'font size']
  },
  {
    id: 'shortcuts.cheatsheet',
    sectionId: 2,
    label: locales.keyboard_shortcuts,
    keywords: ['shortcuts', 'keyboard', 'hotkey']
  },
  {
    id: 'ai.providers',
    sectionId: 3,
    label: locales.ai_settings,
    keywords: ['ai', 'provider', 'openai', 'model']
  },
  {
    id: 'ai.mcp',
    sectionId: 3,
    label: 'MCP',
    keywords: ['mcp', 'server', 'proxy']
  },
  {
    id: 'security.safe_mode',
    sectionId: 4,
    label: locales.safe_mode_password_label,
    keywords: ['safe mode', 'password', 'security', 'biometric']
  },
  {
    id: 'about.version',
    sectionId: 5,
    label: locales.version,
    keywords: ['about', 'version']
  },
  {
    id: 'admin.users',
    sectionId: 6,
    label: locales.administration,
    keywords: ['users', 'admin', 'members']
  }
];

export function getVisibleSections(isAdmin: boolean): SettingsSectionDef[] {
  return SETTINGS_SECTIONS.filter((section) => !section.adminOnly || isAdmin);
}

export function searchSettingsEntries(
  query: string,
  isAdmin: boolean
): Array<SettingsEntryDef & { sectionName: string }> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const visibleSectionIds = new Set(getVisibleSections(isAdmin).map((s) => s.id));
  const sectionNameById = new Map(SETTINGS_SECTIONS.map((s) => [s.id, s.name]));

  return SETTINGS_ENTRIES.filter((entry) => {
    if (!visibleSectionIds.has(entry.sectionId)) {
      return false;
    }
    const haystack = `${entry.label} ${entry.keywords.join(' ')} ${sectionNameById.get(entry.sectionId) ?? ''}`.toLowerCase();
    return haystack.includes(normalized);
  }).map((entry) => ({
    ...entry,
    sectionName: sectionNameById.get(entry.sectionId) ?? ''
  }));
}
