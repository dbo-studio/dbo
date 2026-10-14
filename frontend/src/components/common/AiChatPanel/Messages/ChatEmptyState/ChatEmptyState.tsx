import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import AiSetupPopover from '@/components/common/AiSetupPopover/AiSetupPopover';
import { getAiStatus } from '@/core/ai/aiStatus';
import { canManageAiSettings } from '@/core/auth/permissions';
import { TabMode } from '@/core/enums';
import { openSettings } from '@/core/settings/openSettings';
import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { selectTabs, useTabStore } from '@/store/tabStore/tab.store';
import { Alert, AlertTitle, Button, Stack, Typography } from '@mui/material';
import { useMemo, useState, type JSX, type ReactNode } from 'react';
import type { ChatEmptyStateProps } from '../../types';
import {
  CHAT_PROMPT_ICONS,
  getChatPromptSuggestions,
  NO_CONNECTION_PROMPTS,
  type ChatPromptKey
} from '../../utils/chatPromptSuggestions';
import { StarterCardStyled, StarterGridStyled } from './ChatEmptyState.styled';
import EmptyIllustration from './EmptyIllustration';

function EmptyLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Stack
      spacing={2.5}
      data-testid='ai-chat-empty'
      sx={{ flex: 1, py: 3, px: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 }}
    >
      {children}
    </Stack>
  );
}

function Heading({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }): JSX.Element {
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
      {icon}
      <Typography variant='subtitle2' color='textText'>
        {title}
      </Typography>
      <Typography variant='caption' color='textSubdued' sx={{ maxWidth: 280, lineHeight: 1.5 }}>
        {subtitle}
      </Typography>
    </Stack>
  );
}

function Starters({ keys, onSelect }: { keys: ChatPromptKey[]; onSelect?: (prompt: string) => void }): JSX.Element {
  return (
    <StarterGridStyled>
      {keys.map((key) => (
        <StarterCardStyled key={key} onClick={() => onSelect?.(locales[key])} data-testid={`ai-starter-${key}`}>
          <CustomIcon type={CHAT_PROMPT_ICONS[key]} size='xs' />
          <span>{locales[key]}</span>
        </StarterCardStyled>
      ))}
    </StarterGridStyled>
  );
}

function NoProviderState(): JSX.Element {
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canEdit = canManageAiSettings(mode, user);
  const [setupAnchor, setSetupAnchor] = useState<HTMLElement | null>(null);

  return (
    <EmptyLayout>
      <Heading
        icon={<EmptyIllustration variant='provider' />}
        title={locales.ai_no_provider_title}
        subtitle={canEdit ? locales.ai_no_provider_subtitle : locales.ai_providers_no_permission}
      />
      <Stack direction='row' spacing={1}>
        <Button
          size='small'
          variant='contained'
          onClick={() => openSettings({ section: 3, aiTab: 'providers', highlightId: 'ai.providers' })}
          data-testid='ai-empty-open-settings'
        >
          {locales.ai_open_ai_settings}
        </Button>
        {canEdit && (
          <Button
            size='small'
            variant='outlined'
            onClick={(e) => setSetupAnchor(e.currentTarget)}
            data-testid='ai-empty-quick-setup'
          >
            {locales.ai_quick_setup}
          </Button>
        )}
      </Stack>
      <AiSetupPopover open={!!setupAnchor} anchorEl={setupAnchor} onClose={() => setSetupAnchor(null)} />
    </EmptyLayout>
  );
}

function WhatsNewTip(): JSX.Element | null {
  const seen = useSettingStore((state) => state.editor.aiWhatsNewSeen);
  const updateEditor = useSettingStore((state) => state.updateEditor);
  if (seen) return null;

  return (
    <Alert
      severity='info'
      variant='outlined'
      icon={<CustomIcon type='wand_sparkles' size='xs' />}
      onClose={() => updateEditor({ aiWhatsNewSeen: true })}
      data-testid='ai-whats-new'
      sx={{ width: '100%', py: 0, fontSize: '0.75rem' }}
    >
      <AlertTitle sx={{ fontSize: '0.75rem', mb: 0.25 }}>{locales.ai_whats_new_title}</AlertTitle>
      {locales.ai_whats_new_body}
    </Alert>
  );
}

function ShortcutsHint(): JSX.Element {
  return (
    <Typography variant='caption' color='textSubdued' sx={{ opacity: 0.8 }}>
      {locales.ai_shortcuts_hint.replace('{mod}', tools.isMac() ? '⌘' : 'Ctrl')}
    </Typography>
  );
}

/** Empty chat: onboarding when no provider, generic help without a connection, contextual starters when ready. */
export default function ChatEmptyState({ onSelectPrompt }: ChatEmptyStateProps): JSX.Element {
  const providers = useAiStore((state) => state.providers);
  const context = useAiStore((state) => state.context);
  const hasConnection = useConnectionStore((state) => Boolean(state.currentConnection()));
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const tabs = useTabStore(selectTabs);
  const getQuery = useTabStore((state) => state.getQuery);

  const selectedTab = tabs.find((tab) => tab.id === selectedTabId);
  const editorQuery = selectedTab?.mode === TabMode.Query ? (getQuery(selectedTab.id) || '').trim() : '';
  const promptKeys = useMemo(() => getChatPromptSuggestions(context, editorQuery), [context, editorQuery]);

  if (!getAiStatus(providers).ready) {
    return <NoProviderState />;
  }

  if (!hasConnection) {
    return (
      <EmptyLayout>
        <Heading
          icon={<EmptyIllustration variant='connection' />}
          title={locales.ai_no_connection_title}
          subtitle={locales.ai_no_connection_subtitle}
        />
        <Starters keys={NO_CONNECTION_PROMPTS} onSelect={onSelectPrompt} />
        <ShortcutsHint />
      </EmptyLayout>
    );
  }

  return (
    <EmptyLayout>
      <Heading
        icon={<CustomIcon type='wand_sparkles' size='m' />}
        title={locales.ai_welcome_title}
        subtitle={locales.ai_welcome_subtitle}
      />
      <WhatsNewTip />
      <Starters keys={promptKeys} onSelect={onSelectPrompt} />
      <ShortcutsHint />
    </EmptyLayout>
  );
}
