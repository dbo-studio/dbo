import ScreenHeader from '@/components/base/ScreenHeader/ScreenHeader';
import AiChatPanel from '@/components/common/AiChatPanel/AiChatPanel';
import locales from '@/locales';
import type { JSX } from 'react';
import { ScreenBodyStyled } from '../../MobileShell.styled';

export default function AiScreen(): JSX.Element {
  return (
    <>
      <ScreenHeader title={locales.assistant} />
      <ScreenBodyStyled>
        <AiChatPanel />
      </ScreenBodyStyled>
    </>
  );
}
