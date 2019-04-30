// test environment basically means we're not using webpack for module transforms,
// so we configure babel to do this instead in such cases.
const isTestEnv = process.env.NODE_ENV === 'test';
const shouldTransformModules = isTestEnv;

module.exports = {
  presets: [
    ['@babel/preset-env', {
      // ...config({ modules: 'umd' }).when(isTestEnv),
      ...shouldTransformModules && { modules: 'umd' },
      // useBuiltIns: 'usage',
      // include: [
      //   'es6.math.*',
      //   'es6.object.assign'
      // ]
    }],
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
    ['@babel/transform-runtime', {
      // misleading setting: when this is true, babel will exclude its additional
      // commonjs helper tools from the output bundle (reducing file size)
      // MUST be set to false when babel is doing module transformations.
      // useESModules: !shouldTransformModules,
      corejs: 2
    }],
    'pipe-composition'
  ]
}
