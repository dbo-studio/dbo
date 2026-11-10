import { useMobileNavStore } from '@/store/mobileNavStore/mobileNav.store';
import type { MobileScreen } from '@/store/mobileNavStore/types';
import type { JSX } from 'react';
import type { ScreenStackProps } from '../types';
import { ScreenStackStyled } from './ScreenStack.styled';

/** Shows the top of a tab's stack (or its root). Pushed screens slide in; state lives in stores, so remounts are cheap. */
export default function ScreenStack({ tab, root: Root, screens }: ScreenStackProps): JSX.Element {
  const stack = useMobileNavStore((state) => state.stacks[tab]);
  const top = stack[stack.length - 1] as MobileScreen | undefined;
  const Screen = top ? screens[top.name] : undefined;

  return (
    <ScreenStackStyled key={stack.length} animated={Boolean(top)}>
      {Screen ? <Screen params={top?.params} /> : <Root />}
    </ScreenStackStyled>
  );
}
