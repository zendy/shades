import {
  compose,
  map,
  concat,
  join,
  curry,
  prop,
  propEq,
  equals,
  mapObjIndexed
} from 'ramda';

import styleStore, { getDescriptor } from './style/selector-store';

import {
  dasherize,
  isString,
  isSymbol,
  isNumber,
  isArray,
  isDefined,
  when,
  betterSet,
  includes,
  stateful,
  proxyFunction,
  proxyPropertyGetter,
  proxyRecord,
  anyOf,
  allOf,
  firstItem,
  lastItem
} from '../utilities';

import {
  PSEUDO_SELECTORS,
  COMBINATORS,
  COMBINATOR_INSERTS
} from './selector-types'

const isDescriptorSym    = Symbol('Compute Selector');
const isDescriptor       = (value) => value?.[isDescriptorSym] ?? false;

const keyFromSymbol      = (...args) => Symbol.keyFor(...args);
const symbolFromKey      = (...args) => Symbol.for(...args);
const styleStoreKey = Symbol.for('Shades: styleStore');

const asPseudoClass      = (name) => `:${name |> dasherize}`;
const asPseudoElement    = (name) => `::${name |> dasherize}`;
const asPropertySelector = (givenName) => `!!${givenName}`;

const asPseudoFunction = curry((name, value) => (
  `:${name |> dasherize}(${value})`
));

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
    COMBINATORS.COMBINATOR_AND
  ),
  or:  createCombinator(
    COMBINATORS.COMBINATOR_OR
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
  if (PSEUDO_SELECTORS.CLASSES.includes(targetName)) return (
    targetName |> asPseudoClass
  );

  if (PSEUDO_SELECTORS.FUNCTIONS.includes(targetName)) return (
    compose(
      asPseudoFunction(targetName),
      descriptorToString
    )
  );

  if (PSEUDO_SELECTORS.ELEMENTS.includes(targetName)) return (
    targetName |> asPseudoElement
  )

  return specialChains?.[targetName];
}



const style = (
  proxyPropertyGetter(
    pseudoClassHandler({
      ...pseudoCombinators,
      element: proxyPropertyGetter(asPseudoElement, asPseudoElement),
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
        any: createCombinator(COMBINATORS.PROPERTY_OR),
        all: createCombinator(COMBINATORS.PROPERTY_AND)
      })
    })
  )
)

export default style;
