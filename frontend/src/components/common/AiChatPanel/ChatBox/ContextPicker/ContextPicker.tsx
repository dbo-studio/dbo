import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import locales from '@/locales';
import { Typography } from '@mui/material';
import { Fragment, useEffect, useRef, type JSX } from 'react';
import { CONTEXT_GROUP_LABEL, type ContextOption, type ContextOptionKind } from '../../utils/contextOptions';
import {
  ContextPickerGroupStyled,
  ContextPickerItemStyled,
  ContextPickerListStyled,
  ContextPickerStyled
} from './ContextPicker.styled';

const ICON: Record<ContextOptionKind, keyof typeof IconTypes> = {
  query: 'sql',
  selection: 'sql',
  table: 'sheet',
  view: 'sheet'
};

type ContextPickerProps = {
  options: ContextOption[];
  activeIndex: number;
  onPick: (option: ContextOption) => void;
  onHover?: (index: number) => void;
  /** Search field shown above the list (the @ button); the composer's own text is the search for @ mentions. */
  header?: JSX.Element;
};

/** Grouped, scrollable option list shared by the @ button and the @ mention in the composer. */
export default function ContextPicker({
  options,
  activeIndex,
  onPick,
  onHover,
  header
}: ContextPickerProps): JSX.Element {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <ContextPickerStyled>
      {header}
      <ContextPickerListStyled>
        {options.length === 0 && (
          <Typography
            variant='caption'
            color='textSubdued'
            sx={{ display: 'block', p: 1 }}
            data-testid='ai-mention-empty'
          >
            {locales.ai_context_no_matches}
          </Typography>
        )}
        {options.map((option, index) => {
          const group = CONTEXT_GROUP_LABEL[option.kind];
          const newGroup = index === 0 || CONTEXT_GROUP_LABEL[options[index - 1].kind] !== group;

          return (
            <Fragment key={`${option.kind}-${option.label}`}>
              {newGroup && <ContextPickerGroupStyled>{group}</ContextPickerGroupStyled>}
              <ContextPickerItemStyled
                ref={index === activeIndex ? activeRef : undefined}
                active={index === activeIndex}
                // Keep the focus in the text field: a click must not move it.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(option)}
                onMouseMove={() => onHover?.(index)}
                data-testid='ai-mention-option'
                data-kind={option.kind}
                data-attached={option.attached}
              >
                <CustomIcon type={ICON[option.kind]} size='xs' />
                <Typography variant='caption' color='textText' noWrap sx={{ flex: 1, minWidth: 0 }}>
                  {option.label}
                </Typography>
                {option.attached && <CustomIcon type='check' size='xs' />}
              </ContextPickerItemStyled>
            </Fragment>
          );
        })}
      </ContextPickerListStyled>
    </ContextPickerStyled>
  );
}
