import type { JSX, ReactNode } from 'react';
import { FieldLabelStyled, FieldRootStyled } from './Field.styled';

export default function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <FieldRootStyled>
      <FieldLabelStyled variant='caption' color='textText'>
        {label}
      </FieldLabelStyled>
      {children}
    </FieldRootStyled>
  );
}