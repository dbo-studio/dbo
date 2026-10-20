import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import { variables } from '@/core/theme/variables';
import locales from '@/locales';
import { ListSubheader, MenuItem, MenuList, Typography } from '@mui/material';
import { Fragment, useEffect, useRef, type JSX } from 'react';
import { CONTEXT_GROUP_LABEL, type ContextOption, type ContextOptionKind } from '../../utils/contextOptions';

const ICON: Record<ContextOptionKind, keyof typeof IconTypes> = {
  query: 'sql',
  selection: 'sql',
  database: 'database',
  schema: 'database',
  table: 'sheet',
  view: 'sheet'
};

type ContextPickerProps = {
  options: ContextOption[];
  activeIndex: number;
  onPick: (option: ContextOption) => void;
  onHover?: (index: number) => void;
};

/** Grouped, scrollable option list shared by the @ button and the @ mention in the composer. */
export default function ContextPicker({ options, activeIndex, onPick, onHover }: ContextPickerProps): JSX.Element {
  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (options.length === 0) {
    return (
      <Typography variant='body2' color='textSubdued' sx={{ p: 1.5 }} data-testid='ai-mention-empty'>
        {locales.ai_context_no_matches}
      </Typography>
    );
  }

  return (
    <MenuList sx={{ maxHeight: 280, overflowY: 'auto', py: 0.5 }}>
      {options.map((option, index) => {
        const group = CONTEXT_GROUP_LABEL[option.kind];
        const newGroup = index === 0 || CONTEXT_GROUP_LABEL[options[index - 1].kind] !== group;

        return (
          <Fragment key={`${option.kind}-${option.label}`}>
            {newGroup && (
              <ListSubheader disableSticky sx={{ lineHeight: '24px', fontSize: variables.fontSize.xs }}>
                {group}
              </ListSubheader>
            )}
            <MenuItem
              ref={index === activeIndex ? activeRef : undefined}
              dense
              selected={index === activeIndex}
              onClick={() => onPick(option)}
              onMouseMove={() => onHover?.(index)}
              data-testid='ai-mention-option'
              data-kind={option.kind}
              data-attached={option.attached}
              sx={{ gap: 1 }}
            >
              <CustomIcon type={ICON[option.kind]} size='xs' />
              <Typography variant='body2' noWrap sx={{ flex: 1 }}>
                {option.label}
              </Typography>
              {option.attached && <CustomIcon type='check' size='xs' />}
            </MenuItem>
          </Fragment>
        );
      })}
    </MenuList>
  );
}
