export type ChatContentSegment =
  { type: 'markdown'; content: string } | { type: 'table'; rows: Record<string, unknown>[] };

type TableMatch = {
  start: number;
  end: number;
  rows: Record<string, unknown>[];
};

const JSON_FENCE_PATTERN = /```(?:json)?\s*\n([\s\S]*?)```/gi;

export const parseJsonRowArray = (text: string): Record<string, unknown>[] | null => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('[')) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }

    if (!parsed.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item))) {
      return null;
    }

    return parsed as Record<string, unknown>[];
  } catch {
    return null;
  }
};

const findJsonFenceMatches = (content: string): TableMatch[] => {
  const matches: TableMatch[] = [];
  const pattern = new RegExp(JSON_FENCE_PATTERN.source, JSON_FENCE_PATTERN.flags);

  let match = pattern.exec(content);
  while (match) {
    const rows = parseJsonRowArray(match[1]);
    if (rows) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        rows
      });
    }
    match = pattern.exec(content);
  }

  return matches;
};

const isInsideRanges = (index: number, ranges: TableMatch[]): boolean =>
  ranges.some((range) => index >= range.start && index < range.end);

const findBareJsonArrayMatches = (content: string, excludeRanges: TableMatch[]): TableMatch[] => {
  const matches: TableMatch[] = [];
  const arrayStartPattern = /\[\s*\{/g;

  let match = arrayStartPattern.exec(content);
  while (match) {
    const start = match.index;
    if (!isInsideRanges(start, excludeRanges)) {
      const rows = extractJsonArrayAt(content, start);
      if (rows) {
        const end = start + rows.rawLength;
        matches.push({ start, end, rows: rows.data });
        excludeRanges = [...excludeRanges, { start, end, rows: rows.data }];
      }
    }
    match = arrayStartPattern.exec(content);
  }

  return matches;
};

const extractJsonArrayAt = (
  content: string,
  start: number
): { data: Record<string, unknown>[]; rawLength: number } | null => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < content.length; index += 1) {
    const char = content[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        const slice = content.slice(start, index + 1);
        const data = parseJsonRowArray(slice);
        if (data) {
          return { data, rawLength: slice.length };
        }
        return null;
      }
    }
  }

  return null;
};

const splitMarkdownRow = (line: string): string[] => {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) {
    return [];
  }

  const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  return inner.split('|').map((cell) => cell.trim());
};

const isSeparatorRow = (cells: string[]): boolean =>
  cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));

const ELLIPSIS_CELL_PATTERN = /^(?:\.{2,}|…|\.{1,2}|-{1,3}|—+|\?+)$/;

export const isTablePlaceholderLine = (line: string): boolean => {
  const cells = splitMarkdownRow(line);
  if (cells.length < 2) {
    return false;
  }

  return cells.every((cell) => {
    const trimmed = cell.trim();
    return trimmed === '' || ELLIPSIS_CELL_PATTERN.test(trimmed);
  });
};

const sanitizeMarkdownSegment = (content: string): string => {
  const filtered = content
    .split('\n')
    .filter((line) => !isTablePlaceholderLine(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return filtered;
};

export const parseMarkdownTable = (text: string): Record<string, unknown>[] | null => {
  const lines = text.split('\n');
  if (lines.length < 3) {
    return null;
  }

  const headerCells = splitMarkdownRow(lines[0]);
  const separatorCells = splitMarkdownRow(lines[1]);
  if (headerCells.length < 2 || !isSeparatorRow(separatorCells)) {
    return null;
  }

  const rows: Record<string, unknown>[] = [];
  for (let index = 2; index < lines.length; index += 1) {
    const cells = splitMarkdownRow(lines[index]);
    if (cells.length === 0 || !lines[index].includes('|') || isSeparatorRow(cells)) {
      break;
    }

    const row: Record<string, unknown> = {};
    headerCells.forEach((header, cellIndex) => {
      row[header] = cells[cellIndex] ?? '';
    });
    rows.push(row);
  }

  return rows.length > 0 ? rows : null;
};

const findMarkdownTableMatches = (content: string, excludeRanges: TableMatch[]): TableMatch[] => {
  const matches: TableMatch[] = [];
  const lines = content.split('\n');
  const lineOffsets: number[] = [];
  let offset = 0;

  for (const line of lines) {
    lineOffsets.push(offset);
    offset += line.length + 1;
  }

  let lineIndex = 0;
  while (lineIndex < lines.length) {
    const startOffset = lineOffsets[lineIndex];
    if (isInsideRanges(startOffset, excludeRanges)) {
      lineIndex += 1;
      continue;
    }

    const blockStart = lineIndex;
    const blockLines: string[] = [];
    while (lineIndex < lines.length) {
      const line = lines[lineIndex].trim();
      if (!line) {
        if (blockLines.length === 0) {
          lineIndex += 1;
          continue;
        }
        break;
      }

      if (!line.includes('|')) {
        break;
      }

      blockLines.push(lines[lineIndex]);
      lineIndex += 1;
    }

    if (blockLines.length >= 3) {
      const rows = parseMarkdownTable(blockLines.join('\n'));
      if (rows) {
        const endLine = blockStart + blockLines.length - 1;
        const end = lineOffsets[endLine] + lines[endLine].length;
        const match: TableMatch = { start: lineOffsets[blockStart], end, rows };
        matches.push(match);
        excludeRanges = [...excludeRanges, match];
        continue;
      }
    }

    if (lineIndex === blockStart) {
      lineIndex += 1;
    }
  }

  return matches;
};

const mergeNonOverlappingMatches = (matches: TableMatch[]): TableMatch[] => {
  const sorted = [...matches].sort((a, b) => a.start - b.start);
  const merged: TableMatch[] = [];

  for (const match of sorted) {
    const overlaps = merged.some((existing) => match.start < existing.end && match.end > existing.start);
    if (!overlaps) {
      merged.push(match);
    }
  }

  return merged;
};

const buildSegments = (content: string, matches: TableMatch[]): ChatContentSegment[] => {
  if (matches.length === 0) {
    const markdown = sanitizeMarkdownSegment(content);
    return markdown ? [{ type: 'markdown', content: markdown }] : [];
  }

  const segments: ChatContentSegment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      const markdown = sanitizeMarkdownSegment(content.slice(cursor, match.start));
      if (markdown) {
        segments.push({ type: 'markdown', content: markdown });
      }
    }

    segments.push({ type: 'table', rows: match.rows });
    cursor = match.end;
  }

  const trailing = sanitizeMarkdownSegment(content.slice(cursor));
  if (trailing) {
    segments.push({ type: 'markdown', content: trailing });
  }

  return segments;
};

export const splitChatContent = (content: string): ChatContentSegment[] => {
  if (!content.trim()) {
    return [];
  }

  const fenceMatches = findJsonFenceMatches(content);
  const jsonExcluded = [...fenceMatches];
  const bareMatches = findBareJsonArrayMatches(content, jsonExcluded);
  const jsonMatches = mergeNonOverlappingMatches([...fenceMatches, ...bareMatches]);
  const markdownMatches = findMarkdownTableMatches(content, jsonMatches);
  const matches = mergeNonOverlappingMatches([...jsonMatches, ...markdownMatches]);

  return buildSegments(content, matches);
};
