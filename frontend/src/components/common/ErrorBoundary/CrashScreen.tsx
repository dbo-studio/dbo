import locales from '@/locales';
import { type CSSProperties, type JSX, useEffect } from 'react';

const dismissBootSplash = (): void => {
  document.getElementById('boot-splash')?.remove();
};

const overlayStyle = (isDark: boolean): CSSProperties => ({
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  padding: 24,
  textAlign: 'center',
  background: isDark ? '#1a1c1e' : '#fff',
  color: isDark ? '#e8eaed' : '#1a1c1e',
  fontFamily: 'system-ui, sans-serif'
});

type CrashScreenProps = {
  onReload: () => void;
};

export default function CrashScreen({ onReload }: CrashScreenProps): JSX.Element {
  const isDark = document.documentElement.classList.contains('boot-dark');

  useEffect(() => {
    dismissBootSplash();
  }, []);

  return (
    <div role='alert' data-testid='crash-screen' style={overlayStyle(isDark)}>
      <img
        src='/app-icon/icon-512.png'
        alt='DBO'
        width={120}
        height={120}
        style={{ display: 'block', userSelect: 'none', pointerEvents: 'none' }}
      />
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{locales.crash_title}</h1>
      <p style={{ margin: 0, maxWidth: 420, fontSize: 14, lineHeight: 1.5, opacity: 0.8 }}>
        {locales.crash_description}
      </p>
      <button
        type='button'
        data-testid='crash-reload'
        onClick={onReload}
        style={{
          marginTop: 8,
          padding: '8px 16px',
          border: 'none',
          borderRadius: 6,
          background: '#21b8f0',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        {locales.reload}
      </button>
    </div>
  );
}
