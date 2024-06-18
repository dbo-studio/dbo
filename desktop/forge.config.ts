import { MakerDeb } from '@electron-forge/maker-deb';
import MakerDMG from '@electron-forge/maker-dmg';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true
  },
  rebuildConfig: {},
  makers: [
    // new MakerSquirrel({}),
    // new MakerZIP({}, ['darwin']),
    // new MakerRpm({}),
    new MakerDMG({
      icon: '/app-icon/mac-icon.icns',
      format: 'ULFO'
    }),
    new MakerDeb({
      options: {
        maintainer: 'DBO Studio',
        homepage: 'https://github.com/dbo-studio/dbo'
      }
    })
  ],
  plugins: [
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
  ]
};

export default config;
