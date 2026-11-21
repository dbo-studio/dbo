import type { JSX, ReactNode } from 'react';
import { SectionRootStyled, SectionTitleStyled } from './Section.styled';

export default function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <SectionRootStyled>
      <SectionTitleStyled variant='subtitle2'>{title}</SectionTitleStyled>
      {children}
    </SectionRootStyled>
  );
}