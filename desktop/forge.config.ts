import { MakerDeb } from '@electron-forge/maker-deb';
import MakerDMG from '@electron-forge/maker-dmg';
import AutoUnpackNativesPlugin from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'app-icon/icon',
    extraResource: ['dbo', 'front_build'],
    appVersion: process.env.APP_VERSION
  },
  rebuildConfig: {},
  makers: [
    // new MakerSquirrel({}),
    // new MakerZIP({}, ['darwin']),
    // new MakerRpm({}),
    new MakerDMG({
      icon: 'app-icon/icon.icns',
      background: 'app-icon/background.tiff',
      format: 'ULFO',
      contents: [
        {
          x: 410,
          y: 230,
          type: 'link',
          path: '/Applications'
        },
        {
          x: 130,
          y: 230,
          type: 'file',
          path: '${process.cwd()}/out/dbo-darwin-arm64/dbo.app'
        }
      ],
      additionalDMGOptions: {
        window: {
          size: {
            width: 540,
            height: 380
          }
        }
      }
    }),
    new MakerDeb({
      options: {
        maintainer: 'DBO Studio',
        homepage: 'https://github.com/dbo-studio/dbo',
        icon: 'app-icon/icon.png'
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
    }),
    new AutoUnpackNativesPlugin({})
  ]
};

export default config;
