const isTestEnv = process.env.NODE_ENV === 'test';

const config = (original) => ({
  when: (testValue) => {
    if (!!testValue) return original;
    return {};
  }
})

module.exports = {
  presets: [
    ['@babel/preset-env', {
      ...config({ modules: 'umd' }).when(isTestEnv),
      useBuiltIns: 'entry',
      include: [
        'es6.math.*',
        'es6.object.assign'
      ]
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
    '@babel/transform-runtime',
    'pipe-composition'
  ]
}
