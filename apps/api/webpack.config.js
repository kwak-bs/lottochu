const { composePlugins, withNx } = require('@nx/webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = composePlugins(withNx(), (config) => {
  // NestJS를 위한 추가 설정
  return {
    ...config,
    externals: [
      nodeExternals({
        allowlist: [],
      }),
    ],
    output: {
      ...config.output,
      libraryTarget: 'commonjs2',
    },
  };
});
