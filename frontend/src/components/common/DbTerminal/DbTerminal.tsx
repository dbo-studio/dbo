import api from '@/api';
import { canUseCli } from '@/core/auth/permissions';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { summarizeDocuments } from '@/core/utils/queryResultSummary';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTheme } from '@mui/material';
import { Terminal, useTerminal } from '@wterm/react';
import '@wterm/react/css';
import { useLatestRef } from '@/hooks/useLatestRef';
import { type JSX, useEffect, useRef } from 'react';
import { bold, cyan, dim, formatResult, red, sanitize } from './format';

type DbTerminalProps = {
  connectionId: number;
  /** "sql" statements end with `;` and may span lines; "nosql" is one command per line. */
  engine: 'sql' | 'nosql';
  /** Shown in the prompt. */
  label: string;
};

const MAX_HISTORY = 200;
// Keys the line editor understands. Anything else (other escape sequences, function keys) is ignored.
const KEY = {
  enter: '\r',
  backspace: '\u007f',
  ctrlC: '\u0003',
  ctrlL: '\u000c',
  ctrlU: '\u0015',
  up: '\u001b[A',
  down: '\u001b[B'
} as const;

const histories = new Map<number, string[]>();

/**
 * A terminal for SQL and NoSQL connections. There is no shell behind it: each submitted line is one request to
 * `POST /cli/run`, which applies the same Safe Mode as the editors. Nothing typed or pasted runs without Enter.
 */
export default function DbTerminal({ connectionId, engine, label }: DbTerminalProps): JSX.Element {
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const allowed = canUseCli(mode, user);
  const { palette } = useTheme();
  // ANSI colors come from the app palette so the terminal follows the theme; bright variants use the .light shade.
  const ansi = [
    palette.background.default,
    palette.error.main,
    palette.success.main,
    palette.warning.main,
    palette.info.main,
    palette.secondary.main,
    palette.primary.main,
    palette.text.primary,
    palette.text.secondary,
    palette.error.light,
    palette.success.light,
    palette.warning.light,
    palette.info.light,
    palette.secondary.light,
    palette.primary.light,
    palette.text.primary
  ];

  const { ref: terminalRef, write, focus } = useTerminal();
  const lineRef = useRef('');
  const pendingRef = useRef(''); // SQL statement lines collected so far
  const historyCursorRef = useRef<number | null>(null); // position in history while browsing it
  const runningRef = useRef<AbortController | null>(null);

  const history = (): string[] => {
    const list = histories.get(connectionId) ?? [];
    histories.set(connectionId, list);
    return list;
  };

  const prompt = (): string => (pendingRef.current ? dim('    -> ') : bold(cyan(`${sanitize(label)}`)) + bold('> '));

  const showPrompt = (): void => write(`\r\n${prompt()}`);

  const redraw = (): void => write(`\r\u001b[2K${prompt()}${lineRef.current}`);

  const run = async (input: string): Promise<void> => {
    const controller = new AbortController();
    runningRef.current = controller;

    try {
      const result = await withSafeModeRetry((confirmed) =>
        api.cli.run({ connectionId, input, confirmed }, controller.signal)
      );
      write(`${result === undefined ? dim(locales.cli_not_run) : formatResult(result).join('\r\n')}`);
      // The assistant sees what this command returned.
      if (result !== undefined) {
        const ai = useAiStore.getState();
        ai.updateContext({
          ...ai.context,
          selectedQuery: input,
          queryResultSummary: summarizeDocuments(result.output)
        });
      }
    } catch (e) {
      if (controller.signal.aborted) {
        write(red('^C'));
      } else {
        const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
        write(red(sanitize(message ?? locales.action_failed)));
      }
    } finally {
      runningRef.current = null;
      showPrompt();
    }
  };

  const submit = (): void => {
    const text = lineRef.current.trim();
    lineRef.current = '';
    historyCursorRef.current = null;

    if (!text && !pendingRef.current) {
      showPrompt();
      return;
    }

    if (!pendingRef.current && text === 'clear') {
      write('\u001b[2J\u001b[H');
      write(prompt());
      return;
    }

    if (!pendingRef.current && text === 'help') {
      write(`\r\n${locales.cli_help}`);
      showPrompt();
      return;
    }

    // SQL runs when the statement ends with `;`; until then lines are collected.
    if (engine === 'sql' && !text.endsWith(';')) {
      pendingRef.current = `${pendingRef.current}${text}\n`;
      write(`\r\n${prompt()}`);
      return;
    }

    const input = `${pendingRef.current}${text}`.trim();
    pendingRef.current = '';

    const list = history();
    if (list[list.length - 1] !== input) list.push(input);
    if (list.length > MAX_HISTORY) list.shift();

    write('\r\n');
    void run(input);
  };

  const recall = (dir: -1 | 1): void => {
    const list = history();
    if (list.length === 0) return;
    const next = Math.min(Math.max((historyCursorRef.current ?? list.length) + dir, 0), list.length);
    historyCursorRef.current = next;
    lineRef.current = list[next] ?? '';
    redraw();
  };

  const startedRef = useRef(false);

  /** Applies a command handed over from outside (a chat code block): run it, or leave it on the prompt. */
  const applyPending = (): void => {
    const store = useDataStore.getState();
    const pendingCommand = store.pendingTerminalCommand;
    if (!pendingCommand || !startedRef.current || runningRef.current) return;
    store.clearPendingTerminalCommand();

    const lines = pendingCommand.command
      .split('\n')
      .map((l) => sanitize(l.trim()))
      .filter(Boolean);
    if (lines.length === 0) return;

    if (!pendingCommand.run) {
      lineRef.current = lines[0];
      redraw();
      return;
    }

    void (async (): Promise<void> => {
      for (const input of lines) {
        const list = history();
        if (list[list.length - 1] !== input) list.push(input);
        write(`${input}\r\n`);
        await run(input);
      }
    })();
  };
  const applyPendingRef = useLatestRef(applyPending);
  const pendingCommand = useDataStore((s) => s.pendingTerminalCommand);

  useEffect(() => {
    if (pendingCommand) applyPendingRef.current();
  }, [applyPendingRef, pendingCommand]);

  const start = (): void => {
    if (startedRef.current) return;
    startedRef.current = true;
    write(`${dim(locales.cli_welcome)}\r\n${prompt()}`);
    applyPendingRef.current();
  };

  const handleData = (data: string): void => {
    // A running statement only accepts Ctrl+C.
    if (runningRef.current) {
      if (data === KEY.ctrlC) runningRef.current.abort();
      return;
    }

    // Typed keys arrive one at a time; anything longer that is not an escape sequence is a paste. A paste is
    // flattened to one line and shown, never executed: the user reviews it and presses Enter.
    if (data.length > 1 && !data.startsWith('\u001b')) {
      const text = sanitize(data.replace(/[\r\n]+/g, ' '));
      lineRef.current += text;
      write(text);
      return;
    }

    switch (data) {
      case KEY.enter:
        submit();
        return;
      case KEY.backspace:
        if (lineRef.current) {
          lineRef.current = lineRef.current.slice(0, -1);
          write('\b \b');
        }
        return;
      case KEY.ctrlC:
        lineRef.current = '';
        pendingRef.current = '';
        write(red('^C'));
        showPrompt();
        return;
      case KEY.ctrlL:
        write('\u001b[2J\u001b[H');
        write(`${prompt()}${lineRef.current}`);
        return;
      case KEY.ctrlU:
        lineRef.current = '';
        redraw();
        return;
      case KEY.up:
        recall(-1);
        return;
      case KEY.down:
        recall(1);
        return;
      default:
        // Printable single characters only; control characters and unknown escapes are dropped.
        if (data.length === 1 && data >= ' ' && data !== '\u007f') {
          lineRef.current += data;
          write(data);
        }
    }
  };

  // Leaving the tab cancels a running statement server-side (the request context is aborted).
  useEffect(
    () => (): void => {
      runningRef.current?.abort();
    },
    []
  );

  if (!allowed) {
    return <div style={{ padding: 12 }}>{locales.cli_no_permission}</div>;
  }

  return (
    <Terminal
      ref={terminalRef}
      autoResize
      cursorBlink
      webmcp={false}
      style={
        {
          height: '100%',
          width: '100%',
          borderRadius: 0,
          boxShadow: 'none',
          padding: '8px 12px',
          '--term-bg': palette.background.default,
          '--term-fg': palette.text.primary,
          '--term-cursor': palette.primary.main,
          '--term-font-family': 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace',
          '--term-font-size': '13px',
          '--term-line-height': '1.35',
          '--term-row-height': '18px',
          ...Object.fromEntries(ansi.map((c, i) => [`--term-color-${i}`, c]))
        } as React.CSSProperties
      }
      data-testid='db-terminal'
      // The welcome text waits for the first resize so it is laid out at the real width, not the 80-column default.
      onResize={start}
      onReady={(): void => {
        focus();
        window.setTimeout(start, 250);
      }}
      onData={handleData}
    />
  );
}
