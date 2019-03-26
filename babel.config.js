module.exports = function getBabelConfiguration(api) {
  api.cache(true);
  return {
    comments: false,
    presets: [
      '@babel/preset-flow',
      [
        '@babel/preset-env',
        {
          shippedProposals: true,
          useBuiltIns: 'usage',
          corejs: '3.0.0',
          targets: {
            node: '9',
            browsers: [
              'last 2 Chrome versions',
              'last 2 Firefox versions',
              'last 3 Edge versions',
              'last 1 Safari versions',
            ],
          },
        },
      ],
      ...(process.env.NODE_ENV === 'production' ? ['babel-preset-minify'] : []),
    ].filter(Boolean),
    plugins: [
      '@babel/plugin-transform-runtime',
      '@babel/plugin-proposal-do-expressions',
      '@babel/plugin-proposal-class-properties',
      ...(process.env.NODE_ENV === 'test' ? ['istanbul'] : []),
    ].filter(Boolean),
  };
};
