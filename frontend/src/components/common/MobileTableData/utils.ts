const CARD_TEXT_MAX_LENGTH = 120;

/** Editable text for a cell value; `null` means the value is SQL NULL. */
export const cellToText = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'string' ? value : typeof value === 'bigint' ? value.toString() : JSON.stringify(value);
};

/** Compact, single-line text for a cell value on a card; `null` means the value is SQL NULL. */
export const formatCell = (value: unknown): string | null => {
  const text = cellToText(value);
  return text !== null && text.length > CARD_TEXT_MAX_LENGTH ? `${text.slice(0, CARD_TEXT_MAX_LENGTH)}…` : text;
};
