import ScreenHeader from '@/components/base/ScreenHeader/ScreenHeader';
import Histories from '@/components/common/Histories/Histories';
import locales from '@/locales';
import { useMobileNavStore } from '@/store/mobileNavStore/mobileNav.store';
import type { JSX } from 'react';
import { ScreenContentStyled } from '../../MobileShell.styled';

export default function HistoryScreen(): JSX.Element {
  const pop = useMobileNavStore((state) => state.pop);

  return (
    <>
      <ScreenHeader title={locales.history} onBack={(): void => void pop()} />
      <ScreenContentStyled>
        <Histories />
      </ScreenContentStyled>
    </>
  );
}
