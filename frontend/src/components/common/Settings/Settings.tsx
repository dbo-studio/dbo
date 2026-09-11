import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import NavRail from '@/components/base/NavRail/NavRail';
import GeneralPanel from '@/components/common/Settings/GeneralPanel/GeneralPanel';
import { TabMode } from '@/core/enums';
import { resolvePermissions } from '@/core/auth/permissions';
import { getVisibleSections, searchSettingsEntries } from '@/core/settings/registry';
import { useLayoutMode, useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { SettingsTabType } from '@/types';
import { Box, InputAdornment, Tab, Tabs, Typography } from '@mui/material';
import {
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent
} from 'react';
import AboutPanel from './AboutPanel/AboutPanel';
import AdministrationPanel from './AdministrationPanel/AdministrationPanel';
import AiPanel from './AiPanel/AiPanel';
import AppearancePanel from './AppearancePanel/AppearancePanel';
import MenuPanel from './MenuPanel/MenuPanel';
import SecurityPanel from './SecurityPanel/SecurityPanel';
import {
  SettingsContentInnerStyled,
  SettingsContentPaneStyled,
  SettingsRailSearchStyled,
  SettingsResultItemStyled,
  SettingsResultListStyled,
  SettingsRootStyled,
  SettingsSearchInputStyled
} from './Setting.styled';
import ShortcutPanel from './ShortcutPanel/ShortcutPanel';
import type { MenuPanelTabType } from './types';

const SECTION_CONTENT: Record<number, JSX.Element> = {
  0: <GeneralPanel />,
  1: <AppearancePanel />,
  2: (
    <Box data-settings-id='shortcuts.cheatsheet'>
      <ShortcutPanel />
    </Box>
  ),
  3: <AiPanel />,
  4: <SecurityPanel />,
  5: <AboutPanel />,
  6: (
    <Box data-settings-id='admin.users'>
      <AdministrationPanel />
    </Box>
  )
};

function highlightTarget(highlightId: string): void {
  const el = document.querySelector<HTMLElement>(`[data-settings-id="${highlightId}"]`);
  if (!el) {
    return;
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.dataset.highlighted = 'true';
  window.setTimeout(() => {
    delete el.dataset.highlighted;
  }, 1600);
}

export default function Settings(): JSX.Element {
  const { isMobile } = useLayoutMode();
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const permissions = useMemo(() => resolvePermissions(mode, user), [mode, user]);
  const selectedTab = useSelectedTab();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const focusedOnceRef = useRef(false);

  const settingsTab = selectedTab?.mode === TabMode.Settings ? (selectedTab as SettingsTabType) : undefined;

  const sections = useMemo(() => getVisibleSections(isAdmin, permissions), [isAdmin, permissions]);

  const menuTabs: MenuPanelTabType[] = useMemo(
    () =>
      sections.map((section) => ({
        id: section.id,
        name: section.name,
        description: section.description,
        onlyDesktop: false,
        icon: section.icon,
        keywords: section.keywords,
        group: section.group,
        content:
          section.id === 3 ? (
            <AiPanel key={settingsTab?.aiTab ?? 'providers'} initialTab={settingsTab?.aiTab ?? 'providers'} />
          ) : (
            SECTION_CONTENT[section.id]
          )
      })),
    [sections, settingsTab?.aiTab]
  );

  const [searchQuery, setSearchQuery] = useState(settingsTab?.query ?? '');
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const appliedExternalQueryRef = useRef<string | undefined>(settingsTab?.query);

  const searchResults = useMemo(
    () => searchSettingsEntries(normalizedQuery, isAdmin, permissions),
    [normalizedQuery, isAdmin, permissions]
  );

  const sectionId = settingsTab?.section ?? 0;
  const activeTab = menuTabs.find((tab) => tab.id === sectionId) ?? menuTabs[0];

  const setSearch = useCallback((value: string): void => {
    setSearchQuery(value);
    setActiveResultIndex(0);
  }, []);

  const selectSectionById = useCallback(
    (id: number, extras?: { highlightId?: string; clearQuery?: boolean }): void => {
      if (!settingsTab) {
        return;
      }
      const next: SettingsTabType = {
        ...settingsTab,
        section: id,
        highlightId: extras?.highlightId,
        query: extras?.clearQuery ? undefined : settingsTab.query
      };
      updateSelectedTab(next);
      if (extras?.clearQuery) {
        setSearch('');
      }
      if (extras?.highlightId) {
        window.requestAnimationFrame(() => highlightTarget(extras.highlightId!));
      }
    },
    [settingsTab, updateSelectedTab, setSearch]
  );

  function handleSectionChange(menuTab: MenuPanelTabType | undefined): void {
    if (!menuTab || !settingsTab || settingsTab.section === menuTab.id) {
      return;
    }
    updateSelectedTab({ ...settingsTab, section: menuTab.id, highlightId: undefined, query: undefined });
  }

  function openSearchResult(index: number): void {
    const result = searchResults[index];
    if (!result) {
      return;
    }
    setActiveResultIndex(index);
    selectSectionById(result.sectionId, { highlightId: result.id, clearQuery: true });
  }

  function handleSearchKeyDown(e: ReactKeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length === 0) return;
      setActiveResultIndex((i) => (i + 1) % searchResults.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length === 0) return;
      setActiveResultIndex((i) => (i - 1 + searchResults.length) % searchResults.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      openSearchResult(activeResultIndex);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (searchQuery) {
        setSearch('');
      } else {
        searchInputRef.current?.blur();
      }
    }
  }

  if (settingsTab?.query != null && settingsTab.query !== appliedExternalQueryRef.current) {
    appliedExternalQueryRef.current = settingsTab.query;
    setSearchQuery(settingsTab.query);
    setActiveResultIndex(0);
  }

  useEffect(() => {
    const id = settingsTab?.highlightId;
    if (!id || !settingsTab) {
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      highlightTarget(id);
      updateSelectedTab({ ...settingsTab, highlightId: undefined });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [settingsTab, updateSelectedTab]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      if (!focusedOnceRef.current) {
        focusedOnceRef.current = true;
        searchInputRef.current?.focus();
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const showResults = normalizedQuery.length > 0;

  return (
    <SettingsRootStyled data-testid='settings-panel'>
      <NavRail hideOnMobile>
        <SettingsRailSearchStyled>
          <SettingsSearchInputStyled
            inputRef={searchInputRef}
            value={searchQuery}
            onChange={(e): void => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={locales.search_settings}
            fullWidth
            startAdornment={
              <InputAdornment position='start'>
                <CustomIcon type='search' size='xs' />
              </InputAdornment>
            }
            endAdornment={
              searchQuery.length > 0 ? (
                <InputAdornment position='end' onClick={(): void => setSearch('')} sx={{ cursor: 'pointer' }}>
                  <CustomIcon type='close' size='xs' />
                </InputAdornment>
              ) : undefined
            }
            inputProps={{ 'aria-label': locales.search_settings, 'data-testid': 'settings-search' }}
          />
        </SettingsRailSearchStyled>
        {!showResults && <MenuPanel tabs={menuTabs} onChange={handleSectionChange} defaultTab={activeTab} />}
        {showResults && (
          <Box sx={{ p: 1, overflow: 'auto', flex: 1, minHeight: 0 }}>
            {searchResults.length === 0 ? (
              <Typography color='textSecondary' variant='body2' sx={{ px: 1, py: 2 }}>
                {locales.no_settings_matched}
              </Typography>
            ) : (
              <SettingsResultListStyled role='listbox'>
                {searchResults.map((result, index) => (
                  <SettingsResultItemStyled
                    key={result.id}
                    role='option'
                    aria-selected={index === activeResultIndex}
                    active={index === activeResultIndex}
                    tabIndex={0}
                    onClick={(): void => openSearchResult(index)}
                    onKeyDown={(e): void => {
                      if (e.key === 'Enter') {
                        openSearchResult(index);
                      }
                    }}
                  >
                    <Typography variant='subtitle2' color='textTitle'>
                      {result.label}
                    </Typography>
                    <Typography variant='caption' color='textSecondary'>
                      {result.sectionName}
                    </Typography>
                  </SettingsResultItemStyled>
                ))}
              </SettingsResultListStyled>
            )}
          </Box>
        )}
      </NavRail>

      <SettingsContentPaneStyled>
        <SettingsContentInnerStyled>
          {isMobile && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ px: 0, pb: 1 }}>
                <SettingsSearchInputStyled
                  value={searchQuery}
                  onChange={(e): void => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={locales.search_settings}
                  fullWidth
                  startAdornment={
                    <InputAdornment position='start'>
                      <CustomIcon type='search' size='xs' />
                    </InputAdornment>
                  }
                  inputProps={{ 'aria-label': locales.search_settings }}
                />
              </Box>
              {!showResults && (
                <Tabs
                  value={activeTab.id}
                  onChange={(_, id: number): void => handleSectionChange(menuTabs.find((tab) => tab.id === id))}
                  variant='scrollable'
                  scrollButtons='auto'
                  sx={(theme) => ({
                    minHeight: 36,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    '& .MuiTab-root': {
                      minHeight: 36,
                      textTransform: 'none',
                      color: theme.palette.text.secondary,
                      fontSize: 13
                    },
                    '& .Mui-selected': {
                      color: theme.palette.text.primary
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: theme.palette.primary.main
                    }
                  })}
                >
                  {menuTabs.map((tab) => (
                    <Tab key={tab.id} value={tab.id} label={tab.name} />
                  ))}
                </Tabs>
              )}
            </Box>
          )}

          {showResults && isMobile && (
            <Box sx={{ mb: 2 }}>
              {searchResults.length === 0 ? (
                <Typography color='textSecondary' variant='body2'>
                  {locales.no_settings_matched}
                </Typography>
              ) : (
                <SettingsResultListStyled>
                  {searchResults.map((result, index) => (
                    <SettingsResultItemStyled
                      key={result.id}
                      active={index === activeResultIndex}
                      onClick={(): void => openSearchResult(index)}
                    >
                      <Typography variant='subtitle2'>{result.label}</Typography>
                      <Typography variant='caption' color='textSecondary'>
                        {result.sectionName}
                      </Typography>
                    </SettingsResultItemStyled>
                  ))}
                </SettingsResultListStyled>
              )}
            </Box>
          )}

          {!showResults && (
            <>
              <Box sx={{ mb: 1.5 }}>
                <Typography color='textTitle' variant='subtitle1' sx={{ fontWeight: 600 }}>
                  {activeTab.name}
                </Typography>
                {activeTab.description && (
                  <Typography color='textText' variant='body2'>
                    {activeTab.description}
                  </Typography>
                )}
              </Box>
              {activeTab.id === 3 ? (
                <Box data-settings-id='ai.providers'>
                  <AiPanel key={settingsTab?.aiTab ?? 'providers'} initialTab={settingsTab?.aiTab ?? 'providers'} />
                </Box>
              ) : (
                activeTab.content
              )}
            </>
          )}
        </SettingsContentInnerStyled>
      </SettingsContentPaneStyled>
    </SettingsRootStyled>
  );
}
