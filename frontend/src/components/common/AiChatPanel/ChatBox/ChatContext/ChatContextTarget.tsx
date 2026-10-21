import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import DropDownMenu from '@/components/base/DropDownMenu/DropDownMenu';
import { getEngineCapabilities } from '@/core/db';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { AutoCompleteType } from '@/types';
import { Box, Button, Typography } from '@mui/material';
import { useRef, useState, type JSX } from 'react';
import {
  ContextPickerItemStyled,
  ContextPickerListStyled,
  ContextPickerStyled
} from '../ContextPicker/ContextPicker.styled';

type Level = 'database' | 'schema';

const ELLIPSIS = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

/** Connection · database · schema the assistant works on; database and schema can be switched here. */
export default function ChatContextTarget({ autocomplete }: { autocomplete: AutoCompleteType }): JSX.Element | null {
  const connection = useConnectionStore((state) => state.currentConnection());
  const context = useAiStore((state) => state.context);
  const updateContext = useAiStore((state) => state.updateContext);
  const setAutoContext = useAiStore((state) => state.setAutoContext);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [menu, setMenu] = useState<Level | null>(null);

  const capabilities = getEngineCapabilities(connection?.type);
  const database =
    context.database || (connection && 'database' in connection.options ? connection.options.database : undefined);
  const schema = context.schema;

  if (!connection) return null;

  const choices = menu === 'database' ? autocomplete.databases : autocomplete.schemas;
  const current = menu === 'database' ? database : (schema ?? capabilities.preferredSchema);

  const handlePick = (name: string): void => {
    if (!menu) return;
    // Tables and views belong to one database and schema, so a switch starts them over. A manual
    // choice pins the context so following the explorer does not undo it.
    updateContext(
      menu === 'database'
        ? { ...context, database: name, schema: undefined, tables: [], views: [] }
        : { ...context, schema: name, tables: [], views: [] }
    );
    setAutoContext(false);
    setMenu(null);
  };

  const selector = (level: Level, value: string | undefined, enabled: boolean): JSX.Element | null => {
    if (!enabled || !value) return null;

    return (
      <Button
        size='small'
        color='inherit'
        data-testid={`ai-context-${level}`}
        endIcon={<CustomIcon type='chevronDown' size='xs' />}
        onClick={(e) => {
          anchorRef.current = e.currentTarget;
          setMenu(level);
        }}
        sx={{ flexShrink: 0, maxWidth: 140, minWidth: 0, height: 22, px: 0.5, textTransform: 'none', fontWeight: 400 }}
      >
        <Box component='span' sx={ELLIPSIS}>
          {value}
        </Box>
      </Button>
    );
  };

  return (
    <>
      <Typography
        variant='caption'
        color='textSubdued'
        noWrap
        component='div'
        sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flex: '1 1 auto', minWidth: 0 }}
        data-testid='ai-context-target'
      >
        <CustomIcon type='database' size='xs' />
        <Box component='span' sx={{ ...ELLIPSIS, flexShrink: 1, minWidth: 24 }}>
          {connection.name}
        </Box>
        {selector('database', database, capabilities.hasDatabase)}
        {selector('schema', schema ?? capabilities.preferredSchema, capabilities.hasSchema)}
      </Typography>
      <DropDownMenu open={!!menu} onClose={() => setMenu(null)} anchorRef={anchorRef}>
        <ContextPickerStyled sx={{ width: 200 }}>
          <ContextPickerListStyled>
            {choices.map((name) => (
              <ContextPickerItemStyled
                key={name}
                active={name === current}
                onClick={() => handlePick(name)}
                data-testid='ai-context-choice'
              >
                <Typography variant='caption' color='textText' noWrap sx={{ flex: 1, minWidth: 0 }}>
                  {name}
                </Typography>
                {name === current && <CustomIcon type='check' size='xs' />}
              </ContextPickerItemStyled>
            ))}
            {choices.length === 0 && (
              <Typography variant='caption' color='textSubdued' sx={{ display: 'block', p: 1 }}>
                {locales.ai_context_no_matches}
              </Typography>
            )}
          </ContextPickerListStyled>
        </ContextPickerStyled>
      </DropDownMenu>
    </>
  );
}
