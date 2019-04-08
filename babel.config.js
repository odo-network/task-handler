module.exports = function getBabelConfiguration(api) {
  api.cache(true);
  const plugins = [
    '@babel/plugin-transform-runtime',
    '@babel/plugin-proposal-do-expressions',
    '@babel/plugin-proposal-class-properties'
  ];
  return {
    env: {
      // jest doesn't take account of BABEL_ENV, you need to set NODE_ENV - https://facebook.github.io/jest/docs/getting-started.html#using-babel
      commonjs: {
        presets: [
          '@babel/preset-flow',
          [
            '@babel/preset-env',
            {
              useBuiltIns: false,
            },
          ],
        ],
        plugins,
      },
      es: {
        presets: [
          '@babel/preset-flow',
          [
            '@babel/preset-env',
            {
              useBuiltIns: false,
              modules: false,
            },
          ],
        ],
        plugins,
      },
      test: {
        presets: [
          '@babel/preset-flow',
          [
            '@babel/preset-env',
            {
              useBuiltIns: false,
            },
          ],
        ],
        plugins: [...plugins, 'istanbul'],
      },
    },
  };
};
