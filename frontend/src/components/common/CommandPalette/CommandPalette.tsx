import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useCommandPaletteStore } from '@/store/commandPalette/commandPalette.store';
import { Modal, Typography } from '@mui/material';
import { type JSX, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  PaletteBoxStyled,
  PaletteGroupStyled,
  PaletteInputStyled,
  PaletteItemStyled,
  PaletteListStyled
} from './CommandPalette.styled';
import { useCommands } from './useCommands';

/** Search everything and run anything from one place. */
export default function CommandPalette(): JSX.Element | null {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);

  if (!open) return null;

  return (
    <Modal open onClose={() => setOpen(false)}>
      <PaletteBody onClose={() => setOpen(false)} />
    </Modal>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }): JSX.Element {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const commands = useCommands(query);
  const listRef = useRef<HTMLDivElement>(null);
  const index = Math.min(active, Math.max(0, commands.length - 1));

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const run = (i: number): void => {
    const command = commands[i];
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(Math.min(index + 1, commands.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(index);
    }
  };

  return (
    <PaletteBoxStyled data-testid='command-palette' onKeyDown={onKeyDown} tabIndex={-1}>
      <PaletteInputStyled
        autoFocus
        fullWidth
        value={query}
        placeholder={locales.command_palette_placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        inputProps={{ 'aria-label': locales.command_palette, 'data-testid': 'command-palette-input' }}
      />
      <PaletteListStyled ref={listRef} role='listbox'>
        {commands.length === 0 && (
          <Typography variant='body2' color='textSubdued' sx={{ p: 1.5 }}>
            {locales.command_palette_empty}
          </Typography>
        )}
        {commands.map((command, i) => (
          <div key={command.id}>
            {(i === 0 || commands[i - 1].group !== command.group) && (
              <PaletteGroupStyled>
                <Typography variant='caption'>{command.group}</Typography>
              </PaletteGroupStyled>
            )}
            <PaletteItemStyled
              role='option'
              aria-selected={i === index}
              data-active={i === index}
              active={i === index}
              onMouseMove={() => setActive(i)}
              onClick={() => run(i)}
            >
              <CustomIcon type={command.icon} size='s' />
              <Typography variant='body2' color='inherit' noWrap sx={{ flex: 1 }}>
                {command.label}
              </Typography>
              {command.hint && (
                <Typography variant='caption' color='textSecondary' noWrap>
                  {command.hint}
                </Typography>
              )}
            </PaletteItemStyled>
          </div>
        ))}
      </PaletteListStyled>
    </PaletteBoxStyled>
  );
}
