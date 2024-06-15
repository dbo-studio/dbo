interface IAppConfig {
  siteName: string;
  title: string;
  description: string;
  locale: string;
  direction: 'ltr' | 'rtl';
  apiUrl: string;
}

export const appConfig: IAppConfig = {
  siteName: 'DBO Studio',
  title: 'DBO Studio',
  description: 'Modern and easy to use SQL client',
  locale: 'en',
  direction: 'ltr',
  apiUrl: process.env.NEXT_PUBLIC_SERVER_URL ?? '/api'
};
