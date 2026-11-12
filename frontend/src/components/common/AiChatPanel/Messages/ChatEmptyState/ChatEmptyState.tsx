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
import { Alert, AlertTitle, Box, Button, Stack, Typography, alpha } from '@mui/material';
import { Check } from 'lucide-react';
import { useMemo, useState, type JSX, type ReactNode } from 'react';
import type { ChatEmptyStateProps } from '../../types';
import {
  CHAT_PROMPT_ICONS,
  getChatPromptSuggestions,
  NO_CONNECTION_PROMPTS,
  type ChatPromptKey
} from '../../utils/chatPromptSuggestions';
import { KbdStyled, StarterCardStyled, StarterGridStyled } from './ChatEmptyState.styled';
import EmptyIllustration from './EmptyIllustration';
import { variables } from '@/core/theme/variables';

function EmptyLayout({ children, centered = false }: { children: ReactNode; centered?: boolean }): JSX.Element {
  return (
    <Stack
      spacing={2.5}
      data-testid='ai-chat-empty'
      // Sits just above the composer, where the eye already is, like Cursor's empty chat. Without a composer
      // (no provider yet) it is centered in the panel instead.
      sx={{
        flex: 1,
        py: 3,
        px: 1,
        alignItems: 'center',
        justifyContent: centered ? 'center' : 'flex-end',
        minHeight: 200
      }}
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

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'gemini', name: 'Gemini' },
  { id: 'ollama', name: 'Ollama' }
];

const BENEFITS = [
  { id: 'plain', text: locales.ai_no_provider_point_1 },
  { id: 'schema', text: locales.ai_no_provider_point_2 },
  { id: 'review', text: locales.ai_no_provider_point_3 }
];

/** No provider yet: what the assistant does, which providers work, and the fastest way to connect one. */
function NoProviderState(): JSX.Element {
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canEdit = canManageAiSettings(mode, user);
  const [setupAnchor, setSetupAnchor] = useState<HTMLElement | null>(null);

  return (
    <EmptyLayout centered>
      <Stack spacing={2.5} sx={{ width: '100%', maxWidth: 320 }}>
        <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              display: 'grid',
              placeItems: 'center',
              borderRadius: variables.radius.large,
              color: 'primary.main',
              bgcolor: (theme): string => alpha(theme.palette.primary.main, 0.12)
            }}
          >
            <CustomIcon type='sparkles' size='m' color='currentColor' />
          </Box>
          <Typography variant='subtitle1' color='textTitle' sx={{ fontWeight: 600 }}>
            {locales.ai_no_provider_title}
          </Typography>
          <Typography variant='body2' color='textSubdued'>
            {canEdit ? locales.ai_no_provider_subtitle : locales.ai_providers_no_permission}
          </Typography>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.75 }}>
          {PROVIDERS.map((provider) => (
            <Stack
              key={provider.id}
              direction='row'
              spacing={1}
              sx={{
                alignItems: 'center',
                px: 1.25,
                py: 0.75,
                border: 1,
                borderColor: 'divider',
                borderRadius: variables.radius.medium,
                bgcolor: 'background.paper'
              }}
            >
              <Box component='img' src={`/icons/${provider.id}.svg`} alt='' sx={{ width: 16, height: 16 }} />
              <Typography variant='caption'>{provider.name}</Typography>
            </Stack>
          ))}
        </Box>

        <Stack spacing={0.75}>
          {BENEFITS.map((benefit) => (
            <Stack key={benefit.id} direction='row' spacing={1} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  color: 'primary.main',
                  bgcolor: (theme): string => alpha(theme.palette.primary.main, 0.12)
                }}
              >
                <Check size={10} />
              </Box>
              <Typography variant='caption' color='textSubdued'>
                {benefit.text}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Stack direction='row' spacing={1}>
          {canEdit && (
            <Button
              variant='contained'
              onClick={(e) => setSetupAnchor(e.currentTarget)}
              data-testid='ai-empty-quick-setup'
            >
              {locales.ai_quick_setup}
            </Button>
          )}
          <Button
            variant={canEdit ? 'outlined' : 'contained'}
            onClick={() => openSettings({ section: 3, aiTab: 'providers', highlightId: 'ai.providers' })}
            data-testid='ai-empty-open-settings'
          >
            {locales.ai_open_ai_settings}
          </Button>
        </Stack>
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
      sx={{ width: '100%', py: 0, fontSize: variables.fontSize.sm }}
    >
      <AlertTitle sx={{ fontSize: variables.fontSize.sm, mb: 0.25 }}>{locales.ai_whats_new_title}</AlertTitle>
      {locales.ai_whats_new_body}
    </Alert>
  );
}

function ShortcutsHint(): JSX.Element {
  const mod = tools.isMac() ? '⌘' : 'Ctrl';
  const keys: [string, string][] = [
    ['Enter', locales.ai_shortcut_send],
    ['Esc', locales.ai_shortcut_stop],
    [`${mod} L`, locales.ai_shortcut_focus]
  ];

  return (
    <Stack
      direction='row'
      spacing={1.5}
      sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
      data-testid='ai-shortcuts-hint'
    >
      {keys.map(([key, label]) => (
        <Typography
          key={key}
          variant='caption'
          color='textSubdued'
          sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center' }}
        >
          <KbdStyled>{key}</KbdStyled>
          {label}
        </Typography>
      ))}
    </Stack>
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
