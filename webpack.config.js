const nodeExternals = require('webpack-node-externals');

const moduleRule = (target, loader) => ({
  test: target,
  exclude: /(node_modules|bower_components)/,
  use: {
    loader
  }
});

module.exports = {
  mode: 'production',
  entry: './src/shades.js',
  output: {
    path: './dist',
    filename: 'bundle.js',
    library: '@bupa-digital/shades',
    libraryTarget: 'umd'
  },
  externals: [nodeExternals({
    modulesFromFile: true
  })],
  module: {
    rules: [
      moduleRule(/\.js$/, 'babel-loader')
    ]
  }
}
