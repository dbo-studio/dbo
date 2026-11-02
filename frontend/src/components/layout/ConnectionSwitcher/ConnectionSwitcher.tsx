import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import locales from '@/locales';
import { Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { engineIconOf } from './ConnectionRow';
import ConnectionSwitcherMenu from './ConnectionSwitcherMenu';
import { SwitcherTextStyled, SwitcherTriggerStyled } from './ConnectionSwitcher.styled';

/**
 * The connection is the scope of the explorer, so it is chosen here, at the top of the sidebar,
 * and not in a column of its own.
 */
export default function ConnectionSwitcher(): JSX.Element {
  const current = useCurrentConnection();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <SwitcherTriggerStyled
        onClick={(event) => setAnchor(event.currentTarget)}
        data-testid='connection-switcher'
        aria-haspopup='listbox'
      >
        <CustomIcon type={current ? engineIconOf(current) : 'connection'} size='m' />
        <SwitcherTextStyled>
          <Typography variant='subtitle2' color='textTitle' noWrap>
            {current?.name ?? locales.connection_switcher_none}
          </Typography>
          <Typography variant='caption' color='textSecondary' noWrap>
            {current?.type ?? locales.connection_switcher_pick}
          </Typography>
        </SwitcherTextStyled>
        <CustomIcon type='chevronDown' size='s' />
      </SwitcherTriggerStyled>
      <ConnectionSwitcherMenu anchor={anchor} onClose={() => setAnchor(null)} />
    </>
  );
}
