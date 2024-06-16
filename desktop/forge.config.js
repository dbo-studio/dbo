module.exports = {
//   publishers: [
//     {
//       name: '@electron-forge/publisher-github',
//       config: {
//         repository: {
//           owner: 'me',
//           name: 'awesome-thing'
//         },
//         prerelease: true
//       }
//     }
//   ],
  makers: [
    {
        name: '@electron-forge/maker-dmg',
        config: {
            icon: '/app-icon/mac-icon.icns',
            format: 'ULFO'
        }
    }
  ]
};