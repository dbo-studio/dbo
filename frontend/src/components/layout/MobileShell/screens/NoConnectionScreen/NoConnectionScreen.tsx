import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import MobileConnectionList from '@/components/common/Connections/MobileConnectionList/MobileConnectionList';
import { canCreateConnection } from '@/core/auth/permissions';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Button } from '@mui/material';
import type { JSX } from 'react';
import {
  NoConnectionEngineLogoStyled,
  NoConnectionEngineStyled,
  NoConnectionEnginesStyled,
  NoConnectionHeroStyled,
  NoConnectionListStyled,
  NoConnectionLogoStyled,
  NoConnectionScreenStyled,
  NoConnectionSectionLabelStyled,
  NoConnectionTextStyled,
  NoConnectionTitleStyled
} from './NoConnectionScreen.styled';

const ENGINES = [
  { logo: 'postgresql', name: 'PostgreSQL' },
  { logo: 'mysql', name: 'MySQL' },
  { logo: 'sqlite', name: 'SQLite' },
  { logo: 'mariadb', name: 'MariaDB' }
] as const;

/** Landing page while no connection is selected: onboarding when there are none, otherwise a picker. */
export default function NoConnectionScreen(): JSX.Element {
  const connections = useConnectionStore((state) => state.connections);
  const updateUI = useSettingStore((state) => state.updateUI);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canAddConnection = canCreateConnection(mode, user);

  const openAddConnection = (): void => updateUI({ showAddConnection: true, duplicateConnectionId: undefined });

  if (connections?.length === 0) {
    return (
      <NoConnectionScreenStyled data-testid='mobile-onboarding'>
        <NoConnectionHeroStyled>
          <NoConnectionLogoStyled src='/app-icon/logo.svg' alt='' />
          <NoConnectionTitleStyled>{locales.mobile_onboarding_title}</NoConnectionTitleStyled>
          <NoConnectionTextStyled>{locales.mobile_onboarding_description}</NoConnectionTextStyled>
          <NoConnectionEnginesStyled>
            {ENGINES.map((engine) => (
              <NoConnectionEngineStyled key={engine.logo}>
                <NoConnectionEngineLogoStyled>
                  <CustomIcon type={engine.logo} size='m' />
                </NoConnectionEngineLogoStyled>
                {engine.name}
              </NoConnectionEngineStyled>
            ))}
          </NoConnectionEnginesStyled>
          {canAddConnection && (
            <Button variant='contained' fullWidth sx={{ maxWidth: 320 }} onClick={openAddConnection}>
              {locales.new_connection}
            </Button>
          )}
        </NoConnectionHeroStyled>
      </NoConnectionScreenStyled>
    );
  }

  return (
    <NoConnectionScreenStyled>
      <NoConnectionHeroStyled>
        <NoConnectionTitleStyled>{locales.mobile_choose_connection_title}</NoConnectionTitleStyled>
        <NoConnectionTextStyled>{locales.mobile_choose_connection_hint}</NoConnectionTextStyled>
      </NoConnectionHeroStyled>
      <NoConnectionSectionLabelStyled>{locales.connections}</NoConnectionSectionLabelStyled>
      <NoConnectionListStyled>
        {/* Picking a connection makes it current, which swaps this screen for the tabs. */}
        <MobileConnectionList onOpenCurrent={(): void => undefined} />
      </NoConnectionListStyled>
      {canAddConnection && (
        <NoConnectionHeroStyled>
          <Button variant='outlined' fullWidth sx={{ maxWidth: 320 }} onClick={openAddConnection}>
            {locales.new_connection}
          </Button>
        </NoConnectionHeroStyled>
      )}
    </NoConnectionScreenStyled>
  );
}
