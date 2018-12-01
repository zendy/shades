const isTestEnv = process.env.NODE_ENV === 'test';

const enableModuleTranspilationForTesting = isTestEnv && { modules: 'umd' };

module.exports = {
  presets: [
    ['@babel/preset-env', enableModuleTranspilationForTesting || {}],
    '@babel/preset-react'
  ],
  plugins: [
    'transform-custom-element-classes',
    '@babel/plugin-proposal-class-properties',
    ['@babel/plugin-proposal-decorators', { decoratorsBeforeExport : false }],
    ['@babel/plugin-proposal-pipeline-operator', { proposal: 'minimal' }],
    '@babel/plugin-transform-classes',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-do-expressions',
    '@babel/transform-runtime',
    'pipe-composition'
  ]
}
