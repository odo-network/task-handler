module.exports = {
  presets: [
    '@babel/preset-flow',
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'usage',
        shippedProposals: true,
        targets: {
          browsers: 'last 2 versions',
          node: '9.11.1',
        },
      },
    ],
  ],
  plugins: [
    '@babel/plugin-proposal-do-expressions',
    '@babel/plugin-proposal-class-properties',
  ],
  env: {
    test: {
      plugins: [],
    },
  },
};
