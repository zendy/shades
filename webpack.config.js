const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const path = require('path');

const moduleRule = (target, loader) => ({
  test: target,
  exclude: /(node_modules|bower_components)/,
  use: {
    loader
  }
});

const nodeEnv = process.env.NODE_ENV || 'development';

const isTest = nodeEnv === 'test';
const isProduction = nodeEnv === 'production';
const isDevelopment = !isProduction && !isTest;

const developmentConfig = isDevelopment && {
  mode: 'development',
  devtool: 'source-map'
}

const environmentConfig = developmentConfig || {
  mode: 'production'
};

module.exports = {
  ...environmentConfig,
  entry: {
    lib: './src/shades.js',
    react: './src/with-react.js',
    helpers: './src/helpers.js'
  },
  output: {
    path: __dirname,
    filename: '[name]/index.js',
    library: '@bupa-digital/shades',
    libraryTarget: 'umd'
  },
  externals: [nodeExternals({
    modulesFromFile: true,
    whitelist: (value) => value.includes('@babel')
  })],
  module: {
    rules: [
      moduleRule(/\.js$/, 'babel-loader')
    ]
  },
  plugins: [new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(nodeEnv),
    'process.env.isDevelopment': JSON.stringify(isDevelopment)
  })]
}
