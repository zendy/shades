const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const TerserPlugin = require('terser-webpack-plugin');
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

const developmentConfig = {
  mode: 'development',
  devtool: 'source-map'
}

const productionConfig = {
  mode: 'production',
  devtool: false,
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        cache: true
      })
    ]
  }
};

module.exports = {
  ...isDevelopment && developmentConfig,
  ...isProduction && productionConfig,
  entry: {
    lib: './src/shades.js',
    react: './src/with-react.js',
    'utils.mq': './src/helpers/mq/index.js',
    'utils.style': './src/helpers/style/index.js',
    'utils.style/compat': './src/helpers/style/compat.js'
  },
  output: {
    path: __dirname,
    filename: '[name]/index.js',
    library: '@bupa-digital/shades',
    libraryTarget: 'umd'
  },
  externals: [nodeExternals({
    modulesFromFile: true,
    whitelist: (value) => value.includes('@babel') || value.includes('core-js')
  })],
  module: {
    rules: [
      moduleRule(/\.js$/, 'babel-loader')
    ]
  },
  plugins: [
    new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.HashedModuleIdsPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(nodeEnv),
      'process.env.isDevelopment': JSON.stringify(isDevelopment)
    })
  ]
}
