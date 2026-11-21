import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import AiSetupPopover from '@/components/common/AiSetupPopover/AiSetupPopover';
import { canManageAiSettings } from '@/core/auth/permissions';
import { openSettings } from '@/core/settings/openSettings';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { Button, Stack, Typography } from '@mui/material';
import { Check } from 'lucide-react';
import { useState, type JSX } from 'react';
import { EmptyLayoutStyled } from '../ChatEmptyState.styled';
import {
  BenefitListStyled,
  BenefitMarkStyled,
  BenefitRowStyled,
  NoProviderColumnStyled,
  NoProviderIntroStyled,
  NoProviderTitleStyled,
  ProviderGridStyled,
  ProviderTileStyled,
  SetupIconStyled
} from './NoProviderState.styled';

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
export default function NoProviderState(): JSX.Element {
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canEdit = canManageAiSettings(mode, user);
  const [setupAnchor, setSetupAnchor] = useState<HTMLElement | null>(null);

  return (
    <EmptyLayoutStyled $centered data-testid='ai-chat-empty'>
      <NoProviderColumnStyled>
        <NoProviderIntroStyled>
          <SetupIconStyled>
            <CustomIcon type='sparkles' size='m' color='currentColor' />
          </SetupIconStyled>
          <NoProviderTitleStyled variant='subtitle1' color='textTitle'>
            {locales.ai_no_provider_title}
          </NoProviderTitleStyled>
          <Typography variant='body2' color='textSubdued'>
            {canEdit ? locales.ai_no_provider_subtitle : locales.ai_providers_no_permission}
          </Typography>
        </NoProviderIntroStyled>

        <ProviderGridStyled>
          {PROVIDERS.map((provider) => (
            <ProviderTileStyled key={provider.id} direction='row'>
              <img src={`/icons/${provider.id}.svg`} alt='' width={16} height={16} />
              <Typography variant='caption'>{provider.name}</Typography>
            </ProviderTileStyled>
          ))}
        </ProviderGridStyled>

        <BenefitListStyled>
          {BENEFITS.map((benefit) => (
            <BenefitRowStyled key={benefit.id} direction='row'>
              <BenefitMarkStyled>
                <Check size={10} />
              </BenefitMarkStyled>
              <Typography variant='caption' color='textSubdued'>
                {benefit.text}
              </Typography>
            </BenefitRowStyled>
          ))}
        </BenefitListStyled>

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
      </NoProviderColumnStyled>
      <AiSetupPopover open={!!setupAnchor} anchorEl={setupAnchor} onClose={() => setSetupAnchor(null)} />
    </EmptyLayoutStyled>
  );
}
