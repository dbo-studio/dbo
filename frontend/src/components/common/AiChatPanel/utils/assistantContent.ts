const TOOL_NAMES = 'execute_sql|list_tables|list_views|describe_table';

const TOOL_LEAK_PATTERN = new RegExp(`"name"\\s*:\\s*"(${TOOL_NAMES})"`);

const TOOL_CALL_JSON_PATTERN = new RegExp(
  `\\{\\s*"name"\\s*:\\s*"(${TOOL_NAMES})"\\s*,\\s*"(arguments|parameters)"\\s*:\\s*\\{[\\s\\S]*?\\}\\s*\\}`,
  'g'
);

function hasToolCallLeak(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) {
    return false;
  }
  if (!TOOL_LEAK_PATTERN.test(trimmed)) {
    return false;
  }
  return trimmed.includes('"arguments"') || trimmed.includes('"parameters"');
}

function stripToolCallLeaks(content: string): string {
  return content
    .replace(TOOL_CALL_JSON_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isToolCallLeakContent(content: string): boolean {
  return hasToolCallLeak(content) && stripToolCallLeaks(content) === '';
}

export function sanitizeAssistantContent(content: string, fallback = ''): string {
  if (!hasToolCallLeak(content)) {
    return content;
  }
  const stripped = stripToolCallLeaks(content);
  return stripped || fallback;
}
