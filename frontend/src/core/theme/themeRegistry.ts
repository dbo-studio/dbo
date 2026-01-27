interface ThemeDefinition {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
}

const THEMES: ThemeDefinition[] = [
  { id: 'dbo', name: 'DBO', description: 'Default DBO theme' },
  { id: 'vscode', name: 'VSCode', description: 'Visual Studio Code inspired theme' },
  { id: 'shadcn', name: 'ShadCN', description: 'Modern UI component theme' },
  { id: 'elastic', name: 'Elastic', description: 'Elastic UI framework theme' },
  { id: 'material', name: 'Material', description: 'Google Material Design theme' },
  { id: 'github', name: 'GitHub', description: 'GitHub flavored theme' },
  { id: 'solarized', name: 'Solarized', description: 'Carefully designed color scheme' }
];

export const getAllThemes = (): ThemeDefinition[] => THEMES;

export const getThemeById = (id: string): ThemeDefinition | undefined => THEMES.find((theme) => theme.id === id);

export const getThemeOptions = () =>
  THEMES.map((theme) => ({
    label: theme.name,
    value: theme.id,
    description: theme.description
  }));

export const isValidTheme = (id: string): boolean => THEMES.some((theme) => theme.id === id);

export const getDefaultTheme = (): string => 'dbo';

export const validateTheme = (themeName: string | undefined): string => {
  if (!themeName) return getDefaultTheme();
  return isValidTheme(themeName) ? themeName : getDefaultTheme();
};

export const getThemesByTag = (tag: string): ThemeDefinition[] => THEMES.filter((theme) => theme.tags?.includes(tag));

export const getThemesWithDarkMode = (): ThemeDefinition[] =>
  THEMES.filter((theme) => theme.tags?.includes('dark') || theme.tags?.includes('light'));
