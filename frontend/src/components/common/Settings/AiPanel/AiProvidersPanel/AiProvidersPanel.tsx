import { PROVIDER_NAMES } from '@/core/ai/providerNames';
import { canManageAiSettings } from '@/core/auth/permissions';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useAuthStore } from '@/store/authStore/auth.store';
import { Box, Typography } from '@mui/material';
import { useState, type JSX } from 'react';
import { AiProviderItemStyled, AiProviderListStyled } from './AiProviders.styled';
import ProviderForm from './ProviderForm/ProviderForm';
import ProviderLogo from './ProviderLogo';
import { providerStatus } from './providerStatus';

export default function AiProvidersPanel(): JSX.Element {
  const providers = useAiStore((state) => state.providers);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canEdit = canManageAiSettings(mode, user);
  const [selectedId, setSelectedId] = useState<number | undefined>();

  const selected =
    providers?.find((item) => item.id === selectedId) ?? providers?.find((item) => item.isActive) ?? providers?.[0];

  return (
    <>
      <AiProviderListStyled role='tablist' aria-label={locales.ai_providers_heading}>
        {providers?.map((item) => {
          const status = providerStatus(item);
          return (
            <AiProviderItemStyled
              key={item.id}
              role='tab'
              selected={item.id === selected?.id}
              aria-selected={item.id === selected?.id}
              onClick={() => setSelectedId(item.id)}
              data-testid={`ai-provider-${item.type}`}
            >
              <ProviderLogo type={item.type} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='subtitle2' noWrap>
                  {PROVIDER_NAMES[item.type]}
                </Typography>
                <Typography
                  variant='caption'
                  color={
                    status.tone === 'success'
                      ? 'success.main'
                      : status.tone === 'warning'
                        ? 'warning.main'
                        : 'text.secondary'
                  }
                  noWrap
                  component='div'
                  data-testid={`ai-provider-status-${item.type}`}
                >
                  {status.label}
                </Typography>
              </Box>
            </AiProviderItemStyled>
          );
        })}
      </AiProviderListStyled>

      {selected ? <ProviderForm key={selected.id} provider={selected} canEdit={canEdit} /> : null}
    </>
  );
}
