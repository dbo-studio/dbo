import { isBinaryCellValue, valueToEditorString } from '@/core/utils/dataValue';
import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import { Button, MenuItem, Select, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import LazyCodeEditor from './LazyCodeEditor';
import { TextValueHeaderStyled } from './TextValueView.styled';
import {
  DataValuePanelBodyStyled,
  DataValuePanelCaptionStyled,
  DataValuePanelFooterActionsStyled,
  DataValuePanelFooterStyled
} from './DataValuePanel.styled';
import type { DataValueEditorProps, ValuePanelMode } from './types';

const EDITOR_LANGUAGES = [
  { value: 'text', label: 'Plain text' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'yml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'sql', label: 'SQL' }
] as const;

type EditorLanguage = (typeof EDITOR_LANGUAGES)[number]['value'];

function detectLanguage(draft: string, mode: ValuePanelMode): EditorLanguage {
  if (mode === 'json') {
    return 'json';
  }
  const trimmed = draft.trim();
  return trimmed.startsWith('<') && trimmed.endsWith('>') ? 'html' : 'text';
}

type TextValueViewProps = Pick<
  DataValueEditorProps,
  'value' | 'editable' | 'width' | 'onApply' | 'onCancel' | 'showApply'
> & { mode: Extract<ValuePanelMode, 'text' | 'json'> };

export default function TextValueView({
  value,
  editable,
  width = 360,
  onApply,
  onCancel,
  showApply = true,
  mode
}: TextValueViewProps): JSX.Element {
  const [draft, setDraft] = useState(() => valueToEditorString(value));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [languageChoice, setLanguageChoice] = useState<EditorLanguage | 'auto'>('auto');
  const [, copy] = useCopyToClipboard();
  const language = languageChoice === 'auto' ? detectLanguage(draft, mode) : languageChoice;
  const canEdit = editable && !isBinaryCellValue(value);
  const canFormat = canEdit && (language === 'json' || language === 'sql');

  const handleApply = (): void => {
    if (!canEdit || !onApply) {
      return;
    }
    if (language !== 'json') {
      onApply(draft);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(draft);
      setJsonError(null);
      onApply(typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : locales.invalid_json);
    }
  };

  const handleFormat = (): void => {
    try {
      setDraft(language === 'json' ? JSON.stringify(JSON.parse(draft), null, 2) : tools.formatSql(draft, 'postgresql'));
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : locales.invalid_json);
    }
  };

  return (
    <>
      <TextValueHeaderStyled>
        <Typography variant='caption' color='text.secondary'>
          {locales.language}
        </Typography>
        <Select
          size='small'
          value={languageChoice}
          onChange={(e): void => setLanguageChoice(e.target.value)}
          data-testid='value-panel-language'
        >
          <MenuItem value='auto'>{`${locales.auto_detect} (${EDITOR_LANGUAGES.find((l) => l.value === language)?.label})`}</MenuItem>
          {EDITOR_LANGUAGES.map((l) => (
            <MenuItem key={l.value} value={l.value}>
              {l.label}
            </MenuItem>
          ))}
        </Select>
      </TextValueHeaderStyled>
      <DataValuePanelBodyStyled data-testid={`value-panel-body-${mode}`}>
        <LazyCodeEditor
          width={width}
          value={draft}
          onChange={(v): void => setDraft(v ?? '')}
          editable={canEdit}
          language={language}
        />
      </DataValuePanelBodyStyled>
      {jsonError && (
        <DataValuePanelCaptionStyled variant='caption' color='error'>
          {jsonError}
        </DataValuePanelCaptionStyled>
      )}
      <DataValuePanelFooterStyled>
        {onCancel && (
          <Button size='small' variant='text' onClick={onCancel} data-testid='value-panel-cancel'>
            {locales.cancel}
          </Button>
        )}
        <DataValuePanelFooterActionsStyled>
          <Button
            size='small'
            variant='outlined'
            data-testid='value-panel-copy'
            onClick={(): void => void copy(draft).then((ok) => ok && toast.success(locales.copied))}
          >
            {locales.copy}
          </Button>
          {canFormat && (
            <Button size='small' variant='outlined' onClick={handleFormat} data-testid='value-panel-format'>
              {locales.format}
            </Button>
          )}
          {showApply && onApply && canEdit && (
            <Button size='small' variant='contained' onClick={handleApply} data-testid='value-panel-apply'>
              {locales.apply}
            </Button>
          )}
        </DataValuePanelFooterActionsStyled>
      </DataValuePanelFooterStyled>
    </>
  );
}
