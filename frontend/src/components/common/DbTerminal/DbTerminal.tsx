import api from '@/api';
import { canUseCli } from '@/core/auth/permissions';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useTheme } from '@mui/material';
import { Terminal, useTerminal } from '@wterm/react';
import '@wterm/react/css';
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
    palette.background.default, palette.error.main, palette.success.main, palette.warning.main,
    palette.info.main, palette.secondary.main, palette.primary.main, palette.text.primary,
    palette.text.secondary, palette.error.light, palette.success.light, palette.warning.light,
    palette.info.light, palette.secondary.light, palette.primary.light, palette.text.primary
  ];

  const { ref, write, focus } = useTerminal();
  const line = useRef('');
  const pending = useRef(''); // SQL statement lines collected so far
  const cursor = useRef<number | null>(null); // position in history while browsing it
  const running = useRef<AbortController | null>(null);

  const history = (): string[] => {
    const list = histories.get(connectionId) ?? [];
    histories.set(connectionId, list);
    return list;
  };

  const prompt = (): string => (pending.current ? dim('    -> ') : bold(cyan(`${sanitize(label)}`)) + bold('> '));

  const showPrompt = (): void => write(`\r\n${prompt()}`);

  const redraw = (): void => write(`\r\u001b[2K${prompt()}${line.current}`);

  const run = async (input: string): Promise<void> => {
    const controller = new AbortController();
    running.current = controller;

    try {
      const result = await withSafeModeRetry((confirmed) =>
        api.cli.run({ connectionId, input, confirmed }, controller.signal)
      );
      write(`${result === undefined ? dim(locales.cli_not_run) : formatResult(result).join('\r\n')}`);
    } catch (e) {
      if (controller.signal.aborted) {
        write(red('^C'));
      } else {
        const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
        write(red(sanitize(message ?? locales.action_failed)));
      }
    } finally {
      running.current = null;
      showPrompt();
    }
  };

  const submit = (): void => {
    const text = line.current.trim();
    line.current = '';
    cursor.current = null;

    if (!text && !pending.current) {
      showPrompt();
      return;
    }

    if (!pending.current && text === 'clear') {
      write('\u001b[2J\u001b[H');
      write(prompt());
      return;
    }

    if (!pending.current && text === 'help') {
      write(`\r\n${locales.cli_help}`);
      showPrompt();
      return;
    }

    // SQL runs when the statement ends with `;`; until then lines are collected.
    if (engine === 'sql' && !text.endsWith(';')) {
      pending.current = `${pending.current}${text}\n`;
      write(`\r\n${prompt()}`);
      return;
    }

    const input = `${pending.current}${text}`.trim();
    pending.current = '';

    const list = history();
    if (list[list.length - 1] !== input) list.push(input);
    if (list.length > MAX_HISTORY) list.shift();

    write('\r\n');
    void run(input);
  };

  const recall = (dir: -1 | 1): void => {
    const list = history();
    if (list.length === 0) return;
    const next = Math.min(Math.max((cursor.current ?? list.length) + dir, 0), list.length);
    cursor.current = next;
    line.current = list[next] ?? '';
    redraw();
  };

  const started = useRef(false);
  const start = (): void => {
    if (started.current) return;
    started.current = true;
    write(`${dim(locales.cli_welcome)}\r\n${prompt()}`);
  };

  const handleData = (data: string): void => {
    // A running statement only accepts Ctrl+C.
    if (running.current) {
      if (data === KEY.ctrlC) running.current.abort();
      return;
    }

    // Typed keys arrive one at a time; anything longer that is not an escape sequence is a paste. A paste is
    // flattened to one line and shown, never executed: the user reviews it and presses Enter.
    if (data.length > 1 && !data.startsWith('\u001b')) {
      const text = sanitize(data.replace(/[\r\n]+/g, ' '));
      line.current += text;
      write(text);
      return;
    }

    switch (data) {
      case KEY.enter:
        submit();
        return;
      case KEY.backspace:
        if (line.current) {
          line.current = line.current.slice(0, -1);
          write('\b \b');
        }
        return;
      case KEY.ctrlC:
        line.current = '';
        pending.current = '';
        write(red('^C'));
        showPrompt();
        return;
      case KEY.ctrlL:
        write('\u001b[2J\u001b[H');
        write(`${prompt()}${line.current}`);
        return;
      case KEY.ctrlU:
        line.current = '';
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
          line.current += data;
          write(data);
        }
    }
  };

  // Leaving the tab cancels a running statement server-side (the request context is aborted).
  useEffect(
    () => (): void => {
      running.current?.abort();
    },
    []
  );

  if (!allowed) {
    return <div style={{ padding: 12 }}>{locales.cli_no_permission}</div>;
  }

  return (
    <Terminal
      ref={ref}
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
          ...Object.fromEntries(ansi.map((c, i) => [`--term-color-${i}`, c])),
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
