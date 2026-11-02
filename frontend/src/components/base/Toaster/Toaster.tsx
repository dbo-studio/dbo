import type { JSX } from 'react';
import { Toaster as Sonner } from 'sonner';
import { ToasterRootStyled } from './Toaster.styled';

/** App toasts, dressed in the theme (see Toaster.styled.ts). */
export default function Toaster(): JSX.Element {
  return (
    <ToasterRootStyled>
      <Sonner position='bottom-center' duration={5000} closeButton toastOptions={{ unstyled: true }} />
    </ToasterRootStyled>
  );
}
