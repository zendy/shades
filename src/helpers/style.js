import {
  compose,
  map,
  join
} from 'ramda';

import {
  dasherize,
  isString,
  isSymbol,
  isNumber,
  when,
  betterSet,
  includes,
  stateful,
  proxyFunction,
  proxyPropertyGetter
} from '../utilities';

const interceptMethodCall = (methodName, interceptor) => (original) => (
  new Proxy(original, {
    get: (target, name) => {
      const originalMethod = Reflect.get(target, name);
      if (name === methodName) return (...args) => interceptor(originalMethod(...args));

      return originalMethod;
    }
  })
);

const pseudoElementNames = [
  'before',
  'after',
  'backdrop',
  'cue',
  'firstLetter',
  'firstLine',
  'grammarError',
  'placeholder',
  'selection',
  'spellingError'
];

const pseudoFunctionNames = [
  'dir',
  'lang',
  'not',
  'nthChild',
  'nthLastChild',
  'nthLastOfType',
  'nthOfType'
];

const pseudoClassNames = [
  'active',
  'any',
  'anyLink',
  'checked',
  'default',
  'disabled',
  'empty',
  'enabled',
  'first',
  'firstChild',
  'firstOfType',
  'fullscreen',
  'focus',
  'hover',
  'indeterminate',
  'inRange',
  'invalid',
  'lastChild',
  'lastOfType',
  'left',
  'link',
  'onlyChild',
  'onlyOfType',
  'optional',
  'outOfRange',
  'readOnly',
  'readWrite',
  'required',
  'right',
  'root',
  'scope',
  'target',
  'valid',
  'visited'
];

const KINDS = {
  COMBINATOR_AND: 'combinator.and',
  COMBINATOR_OR: 'combinator.or',
  ATTRIBUTE: 'attribute',
  PSEUDO_CLASS: 'pseudo-class',
  PSEUDO_ELEMENT: 'pseudo-element',
  PROPERTY: 'property'
};

const kindKey = Symbol('Selector Kind');
const valueKey = Symbol('Selector value');
const stringKeyProp = Symbol('The string key thing');
const symbolKeyProp = Symbol('The symbol of the key');

const symbolProp = (target) => (original) => original?.[target] ?? original;

const keyFromSymbol = (...args) => Symbol.keyFor(...args);
const symbolFromKey = (...args) => Symbol.for(...args);

const joinSymbols = (separator) => compose(
  symbolFromKey,
  join(separator),
  map(when(isSymbol).then(keyFromSymbol))
);

const createDescriptor = (kind, stringKey) => (value) => {
  const keyOrValue = stringKey ?? value |> when(isString).otherwise(JSON.stringify);
  const symbolKey  = symbolFromKey(keyOrValue);

  const selfDescriptor = {
    [kindKey]: kind,
    [valueKey]: value,
    [stringKeyProp]: keyOrValue,
    [symbolKeyProp]: symbolKey,
    // this toString doesnt actually return a string
    // it instead returns a symbol whose key is a string
    toString: () => symbolKey,
    toDescriptor: () => selfDescriptor
  };

  return selfDescriptor;
};

const styleStore = stateful(
  new Map(),
  {
    addItem: (store, itemKey, itemValue) => store.set(itemKey, itemValue)
  }
)

const storeDescriptor = (descriptorItem) => {
  const symbolKey = descriptorItem[symbolKeyProp];

  styleStore.lift(({ addItem }) => addItem(symbolKey, descriptorItem));

  return descriptorItem;
};

const getDescriptor = (key) => {
  return styleStore.getState(key);
}

const mapToProp = (propName) => map(symbolProp(propName));

const COMBINATOR_INSERTS = {
  [KINDS.COMBINATOR_AND]: '&&',
  [KINDS.COMBINATOR_OR]: '||'
}

const createCombinator = (kind) => (...data) => (
  data |> createDescriptor(
    kind,
    data |> mapToProp(stringKeyProp) |> join(` ${COMBINATOR_INSERTS[kind]} `)
  ) |> storeDescriptor
)

const pseudoCombinators = {
  and: createCombinator(KINDS.COMBINATOR_AND),
  or:  createCombinator(KINDS.COMBINATOR_OR)
};

const withAttribute = (givenName) => {
  const quoteString = JSON.stringify;
  const wrapWithDescriptor = (originalFn) => (...args) => (
    originalFn(...args) |> createDescriptor(KINDS.ATTRIBUTE)
  )

  const attrWithValue  = wrapWithDescriptor((givenValue) => `[${givenName}=${givenValue  |> quoteString}]`);
  const attrStartsWith = wrapWithDescriptor((givenValue) => `[${givenName}^=${givenValue |> quoteString}]`);
  const attrEndsWith   = wrapWithDescriptor((givenValue) => `[${givenName}$=${givenValue |> quoteString}]`);
  const attrContains   = wrapWithDescriptor((givenValue) => `[${givenName}*=${givenValue |> quoteString}]`);

  const anyCombinator = (mapperFn) => (...givenValues) => pseudoCombinators.or(
    ...givenValues.map(mapperFn)
  );

  const getPlainValue = () => `[${givenName}]`;

  const outerMethods = {
    toString:      getPlainValue,
    toDescriptor:  compose(createDescriptor(KINDS.ATTRIBUTE), getPlainValue),
    anyOf:         anyCombinator(attrWithValue),
    contains:      attrContains,
    containsAny:   anyCombinator(attrContains),
    startsWith:    attrStartsWith,
    startsWithAny: anyCombinator(attrStartsWith),
    endsWith:      attrEndsWith,
    endsWithAny:   anyCombinator(attrEndsWith)
  };

  return proxyFunction(
    attrWithValue,
    outerMethods
  )
}

const allowDataChain = (originalFn) => (givenName) => {
  if (givenName === 'data') return proxyPropertyGetter(
    (dataAttrName) => originalFn(`data-${dataAttrName}`)
  );

  return originalFn(givenName);
}

const descriptorToString = when(isString).otherwise(symbolProp(stringKeyProp))

const createPropDescriptor = (givenName) => `!!${givenName}` |> createDescriptor(KINDS.PROPERTY);

const pseudoClassHandler = (specialChains) => (targetName) => {
  if (pseudoClassNames.includes(targetName)) {
    return `:${targetName |> dasherize}` |> createDescriptor(KINDS.PSEUDO_CLASS);
  }

  if (pseudoFunctionNames.includes(targetName)) {
    return compose(
      (value) => `:${targetName |> dasherize}(${value})` |> createDescriptor(KINDS.PSEUDO_CLASS),
      descriptorToString
    );
  }

  return specialChains?.[targetName];
};

const style = do {
  proxyPropertyGetter(
    pseudoClassHandler({
      ...pseudoCombinators,
      attr: compose(
        withAttribute |> allowDataChain,
        dasherize
      ) |> proxyPropertyGetter,
      prop: createPropDescriptor
    })
  )
}

export default style;

const parsingRules = () => {

}

export const isAndCombinator = compose(
  includes(' && '),
  keyFromSymbol
)

export const parseStyleSymbol = (topSelector, combinatorSymbol) => {

}

// export cn

//
// shades.button({
//   background: 'blue',
//   [select.before]: {
//     color: 'purple'
//   },
//   [style.nthLastChild(1)]: {
//     color: 'green'
//   },
//   [style.not(style.hover)]: {
//     color: 'blue'
//   },
//   [style.hover.and.prop.primary]
// });
//
// shades.button((allProps) => ({
//   [style.prop.primary]: {
//     color: 'blue',
//     backgroundColor: 'blue'
//   },
//   [style.prop.secondary]: {
//     color: 'purple'
//   },
//   // for data attributes, equivalent to [data-tooltip]
//   [style.data.tooltip]: {
//
//   },
//   [style.or(
//     style.hover, style.active
//   )]: {
//
//   },
//   [style.prop.userType('member')]: (memberType) => {
//     background: 'green'
//   },
//   '::after'
//   [select.after]: {
//     [style.prop.icon(
//       style.oneOf('open', 'close', 'disabled')
//     )]: (value) => ({
//       content: value
//     })
//   },
//   [style.prop('specialItem')]: when(startsWith('secret')).onlyThen({
//
//   })
//   [select.after]: {
//     [style.prop.icon.oneOf('open', 'close', 'disabled')]: (value) => ({
//       content: value
//     })
//   }
// }))
//
// //
// // [state.prop.superSayan]: {
// //
// // },
// // [state.hover.active]
// // [style.all(style.hover, style.active)]
// // [state.hover.and.active]: {
// //   background: 'red'
// // },
// // [state.not.active],
// // [state.not.prop('superSayan')]
