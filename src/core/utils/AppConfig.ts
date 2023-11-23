const { version } = require("../../../package.json");

interface IAppConfig {
  siteName: string;
  title: string;
  description: string;
  locale: string;
  direction: "ltr" | "rtl";
  version: string;
}

const AppConfig: IAppConfig = {
  siteName: "DBO",
  title: "DBO",
  description: "test",
  locale: "en",
  direction: "ltr",
  version: version,
};

export default AppConfig;
