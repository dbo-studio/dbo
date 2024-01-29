import { version } from '../package.json';

interface IAppConfig {
  siteName: string;
  title: string;
  description: string;
  locale: string;
  direction: 'ltr' | 'rtl';
  version: string;
}

export const appConfig: IAppConfig = {
  siteName: 'DBO',
  title: 'DBO',
  description: 'test',
  locale: 'en',
  direction: 'ltr',
  version: version
};
