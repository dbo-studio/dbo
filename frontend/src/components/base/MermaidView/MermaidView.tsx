import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, CircularProgress, Typography } from '@mui/material';
import { type JSX, useEffect, useId, useState } from 'react';

type MermaidViewProps = {
  code: string;
  /** Shown when the code is not a diagram mermaid can draw. */
  fallback: JSX.Element;
};

/**
 * Draws a mermaid diagram. The library is large, so it loads the first time a diagram shows. Its strict
 * security level strips scripts and links from the drawn SVG.
 */
export default function MermaidView({ code, fallback }: MermaidViewProps): JSX.Element {
  const isDark = useSettingStore((state) => state.theme.isDark);
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [svg, setSvg] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('mermaid')
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: isDark ? 'dark' : 'default' });
        const { svg: drawn } = await mermaid.render(id, code);
        if (!cancelled) setSvg(drawn);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [code, id, isDark]);

  if (failed) {
    return (
      <Box>
        <Typography variant='caption' color='textSubdued' sx={{ px: 1.5, pt: 1, display: 'block' }}>
          {locales.diagram_render_failed}
        </Typography>
        {fallback}
      </Box>
    );
  }

  if (!svg) return <CircularProgress size={16} sx={{ m: 1.5 }} />;

  return (
    <Box
      data-testid='mermaid-diagram'
      sx={{ p: 1.5, overflow: 'auto', '& svg': { maxWidth: '100%', height: 'auto' } }}
      // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- mermaid output, sanitized by its strict security level
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
