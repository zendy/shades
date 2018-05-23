import {
  compose,
  map,
  concat,
  join,
  curry,
  prop
} from 'ramda';

import {
  dasherize,
  isString,
  isSymbol,
  isNumber,
  isDefined,
  when,
  betterSet,
  includes,
  stateful,
  proxyFunction,
  proxyPropertyGetter,
  proxyRecord
} from '../utilities';

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
  'any',
  'dir',
  'lang',
  'matches',
  'not',
  'nthChild',
  'nthLastChild',
  'nthLastOfType',
  'nthOfType'
];

const pseudoClassNames = [
  'active',
  'anyLink',
  'checked',
  'default',
  'defined',
  'disabled',
  'empty',
  'enabled',
  'first',
  'firstChild',
  'firstOfType',
  'fullscreen',
  'focus',
  'focusWithin',
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
  'placeholderShown',
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

export const KINDS = {
  COMBINATOR_AND: 'combinator.and',
  COMBINATOR_OR:  'combinator.or',
  PROPERTY_AND:   'property.and',
  PROPERTY_OR:    'property.or'
};

const COMBINATOR_INSERTS = {
  [KINDS.COMBINATOR_AND]: '&&',
  [KINDS.PROPERTY_AND]:   '&&',
  [KINDS.COMBINATOR_OR]:  '||',
  [KINDS.PROPERTY_OR]:    '||'
}

const isDescriptorSym    = Symbol('Compute Selector');
const isDescriptor = (value) => value?.[isDescriptorSym] ?? false;

const keyFromSymbol      = (...args) => Symbol.keyFor(...args);
const symbolFromKey      = (...args) => Symbol.for(...args);

const asPseudoClass      = (name) => `:${name |> dasherize}`;
const asPseudoElement    = (name) => `::${name |> dasherize}`;
const asPropertySelector = (givenName) => `!!${givenName}`;

const asPseudoFunction = curry((name, value) => (
  `:${name |> dasherize}(${value})`
));

const styleStore = stateful(
  new Map(),
  {
    addItem: (store, itemKey, itemValue) => store.set(itemKey, itemValue)
  }
);

export const getDescriptor = (key) => styleStore.getState(key);

const storeDescriptor = (descriptorItem) => {
  const symbolKey = descriptorItem.symbolKey;

  styleStore.lift(
    ({ addItem }) => addItem(symbolKey, descriptorItem)
  );

  return descriptorItem;
};

const createDescriptor = (kind, config = {}) => (value) => {
  const keyOrValue = (
    config?.stringKey ?? value
    |> when(isString).otherwise(JSON.stringify)
  );

  const symbolKey  = symbolFromKey(keyOrValue);

  const selfDescriptor = {
    [isDescriptorSym]:    true,
    kind,
    value,
    symbolKey,
    originalKey:          keyOrValue,
    // this toString doesnt actually return a string
    // it instead returns a symbol whose key is a string
    toString:        () => symbolKey
  };

  return selfDescriptor;
};

const toString = (value) => value.toString();

const descriptorToString = when(isDescriptor).then(prop('originalKey'));
const anythingToString = when(isString).otherwise(toString);

const createAndStoreDescriptor = (kind, config) => compose(
  storeDescriptor,
  createDescriptor(kind, config)
);

const createCombinator = (kind) => (...data) => {
  const stringKey = (
    data
    |> map(
      compose(
        anythingToString,
        descriptorToString
      )
    )
    |> join(` ${COMBINATOR_INSERTS[kind]} `)
  );

  return data |> createAndStoreDescriptor(
    kind,
    { stringKey }
  );
}

const pseudoCombinators = {
  and: createCombinator(
    KINDS.COMBINATOR_AND
  ),
  or:  createCombinator(
    KINDS.COMBINATOR_OR
  )
};

const withAttribute = (givenName) => {
  const quoteString = JSON.stringify;

  const attrWithValue  = (givenValue) => `[${givenName}=${givenValue  |> quoteString}]`;
  const attrStartsWith = (givenValue) => `[${givenName}^=${givenValue |> quoteString}]`;
  const attrEndsWith   = (givenValue) => `[${givenName}$=${givenValue |> quoteString}]`;
  const attrContains   = (givenValue) => `[${givenName}*=${givenValue |> quoteString}]`;

  const anyCombinator = (mapperFn) => (...givenValues) => pseudoCombinators.or(
    ...givenValues.map(mapperFn)
  );

  const plainValue = `[${givenName}]`;

  const outerMethods = {
    anyOf:         anyCombinator(attrWithValue),
    contains:      attrContains,
    containsAny:   anyCombinator(attrContains),
    startsWith:    attrStartsWith,
    startsWithAny: anyCombinator(attrStartsWith),
    endsWith:      attrEndsWith,
    endsWithAny:   anyCombinator(attrEndsWith),
    toString: () => plainValue
  };

  return proxyFunction(
    attrWithValue,
    outerMethods
  )
}

const pseudoClassHandler = (specialChains) => (targetName) => {
  if (pseudoClassNames.includes(targetName)) return (
    targetName |> asPseudoClass
  );

  if (pseudoFunctionNames.includes(targetName)) return (
    compose(
      asPseudoFunction(targetName),
      descriptorToString
    )
  );

  if (pseudoElementNames.includes(targetName)) return (
    targetName |> asPseudoElement
  )

  return specialChains?.[targetName];
}

const style = (
  proxyPropertyGetter(
    pseudoClassHandler({
      ...pseudoCombinators,
      element: asPseudoElement,
      pseudo: (name, value) => {
        if (isDefined(value)) return asPseudoFunction(name, value);
        return asPseudoClass(name);
      },
      data: proxyPropertyGetter(
        when(isString).then(compose(
          withAttribute,
          concat('data-'),
          dasherize
        ))
      ),
      attr: proxyPropertyGetter(
        when(isString).then(compose(
          withAttribute,
          dasherize
        ))
      ),
      prop: proxyPropertyGetter(
        when(isString).then(asPropertySelector)
      ),
      props: ({
        any: createCombinator(KINDS.PROPERTY_OR),
        all: createCombinator(KINDS.PROPERTY_AND)
      })
    })
  )
)

export default style;
