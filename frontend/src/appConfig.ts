interface IAppConfig {
  siteName: string;
  title: string;
  description: string;
  locale: string;
  direction: 'ltr' | 'rtl';
  version: string;
}

export const appConfig: IAppConfig = {
  siteName: 'DBO Studio',
  title: 'DBO Studio',
  description: 'Minimal SQL Client',
  locale: 'en',
  direction: 'ltr',
  version: '0'
};
