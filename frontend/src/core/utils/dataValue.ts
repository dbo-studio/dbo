import type { BinaryCellValue, ColumnType, MappedType } from '@/types';

/** Types that must not dump heavy/raw payloads into cells (use cues instead). JSON/geometry stay editable as text. */
const CUE_ONLY_MAPPED_TYPES = new Set<MappedType>(['binary']);

export const isBinaryCellValue = (value: unknown): value is BinaryCellValue => {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__dbo' in value &&
    (value as BinaryCellValue).__dbo === 'binary' &&
    typeof (value as BinaryCellValue).length === 'number'
  );
};

export const formatByteSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** True when the cell should not open an inline editor for the raw value (use Quick Look). */
export const isComplexMappedType = (mappedType: string | undefined): boolean => {
  return CUE_ONLY_MAPPED_TYPES.has((mappedType ?? 'unknown') as MappedType);
};

export const sniffImageFromBase64 = (base64: string | undefined): boolean => {
  return sniffMagic(base64) !== null;
};

/** Returns image mime when magic bytes match; null otherwise. */
export const sniffMagic = (base64: string | undefined): string | null => {
  if (!base64) {
    return null;
  }
  try {
    const binary = atob(base64.slice(0, 32));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return 'image/png';
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return 'image/gif';
    }
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes.length >= 12 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'image/webp';
    }
  } catch {
    return null;
  }
  return null;
};

export const getCellCueLabel = (value: unknown, mappedType: string | undefined): string | null => {
  if (isBinaryCellValue(value)) {
    // Prefer semantic cues when the column type is known.
    if (mappedType === 'geometry') {
      return '[geometry]';
    }
    if (sniffImageFromBase64(value.base64)) {
      return `[image] ${formatByteSize(value.length)}`;
    }
    return '[hex]';
  }

  switch (mappedType) {
    case 'binary':
      return '[blob]';
    case 'json':
    case 'geometry':
      return null;
    default:
      return null;
  }
};

export const formatCellDisplayValue = (value: unknown, column?: ColumnType): string => {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  const cue = getCellCueLabel(value, column?.mappedType);
  if (cue) {
    return cue;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[object]';
    }
  }

  return '[unknown]';
};

/** Single source for grid search indexing and row highlight matching. */
export const cellSearchText = (value: unknown, column?: ColumnType): string => {
  return formatCellDisplayValue(value, column);
};

export const valueToEditorString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (isBinaryCellValue(value)) {
    return value.base64 ?? '';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      } catch {
        return value;
      }
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '';
    }
  }
  return '';
};

/** Parse spaced/continuous hex into a binary cell payload for Quick Look Apply. */
export const hexStringToBinaryCellValue = (hex: string): BinaryCellValue | null => {
  const cleaned = hex.replace(/[^0-9a-fA-F]/g, '');
  if (!cleaned || cleaned.length % 2 !== 0) {
    return null;
  }
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return bytesToBinaryCellValue(bytes);
};

export const bytesToBinaryCellValue = (bytes: Uint8Array): BinaryCellValue => {
  let binary = '';
  // Chunk to avoid call-stack / argument limits on large payloads.
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return {
    __dbo: 'binary',
    length: bytes.length,
    base64: btoa(binary)
  };
};

export const fileToBinaryCellValue = async (file: File): Promise<BinaryCellValue> => {
  const buffer = await file.arrayBuffer();
  return bytesToBinaryCellValue(new Uint8Array(buffer));
};

export const sniffImageMimeFromBase64 = (base64: string | undefined): string => {
  return sniffMagic(base64) ?? 'application/octet-stream';
};

export const imageSrcFromBase64 = (base64: string | undefined): string | null => {
  if (!base64) {
    return null;
  }
  const mime = sniffImageMimeFromBase64(base64);
  return `data:${mime};base64,${base64}`;
};

/** Max bytes rendered/edited as hex in Quick Look (keeps UI responsive). */
export const HEX_PREVIEW_MAX_BYTES = 64 * 1024;

export const bytesToHex = (
  base64: string | undefined,
  maxBytes = HEX_PREVIEW_MAX_BYTES
): { hex: string; truncated: boolean; total: number } => {
  if (!base64) {
    return { hex: '', truncated: false, total: 0 };
  }
  try {
    const binary = atob(base64);
    const total = binary.length;
    const limit = Math.min(total, maxBytes);
    const parts: string[] = [];
    for (let i = 0; i < limit; i += 1) {
      parts.push(binary.charCodeAt(i).toString(16).padStart(2, '0'));
      if ((i + 1) % 16 === 0) {
        parts.push('\n');
      } else {
        parts.push(' ');
      }
    }
    return { hex: parts.join('').trim(), truncated: total > maxBytes, total };
  } catch {
    return { hex: '', truncated: false, total: 0 };
  }
};

export const downloadBinaryCell = (binary: BinaryCellValue, columnName?: string): void => {
  if (!binary.base64) {
    return;
  }
  const mime = sniffImageMimeFromBase64(binary.base64);
  const ext =
    mime === 'image/png'
      ? 'png'
      : mime === 'image/jpeg'
        ? 'jpg'
        : mime === 'image/gif'
          ? 'gif'
          : mime === 'image/webp'
            ? 'webp'
            : 'bin';
  const binaryString = atob(binary.base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${columnName ?? 'blob'}.${ext}`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const resolveValuePanelMode = (
  value: unknown,
  mappedType: string | undefined
): 'text' | 'json' | 'hex' | 'image' | 'geometry' => {
  if (mappedType === 'geometry') {
    return 'geometry';
  }
  if (isBinaryCellValue(value) || mappedType === 'binary') {
    if (isBinaryCellValue(value) && sniffImageFromBase64(value.base64)) {
      return 'image';
    }
    return 'hex';
  }
  if (mappedType === 'json') {
    return 'json';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        // fall through
      }
    }
  }
  return 'text';
};
