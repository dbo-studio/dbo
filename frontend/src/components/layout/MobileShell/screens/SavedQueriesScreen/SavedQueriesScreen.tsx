import ScreenHeader from '@/components/base/ScreenHeader/ScreenHeader';
import SavedQueries from '@/components/common/SavedQueries/SavedQueries';
import locales from '@/locales';
import { useMobileNavStore } from '@/store/mobileNavStore/mobileNav.store';
import type { JSX } from 'react';
import { ScreenBodyStyled } from '../../MobileShell.styled';

export default function SavedQueriesScreen(): JSX.Element {
  const pop = useMobileNavStore((state) => state.pop);

  return (
    <>
      <ScreenHeader title={locales.queries} onBack={(): void => void pop()} />
      <ScreenBodyStyled>
        <SavedQueries />
      </ScreenBodyStyled>
    </>
  );
}
