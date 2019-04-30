import {
  compose,
  map,
  concat,
  join,
  curry,
  prop,
  propEq,
  pipe,
  equals,
  mapObjIndexed,
  has,
  both
} from 'ramda';

import selectorRegistry, {
  asPropertySelector,
  isDescriptorSelector,
  isDescriptorObject,
  createDescriptor
} from '../../registries/selectors';

import {
  dasherize,
  isString,
  isSymbol,
  isNumber,
  isArray,
  isDefined,
  when,
  getPath,
  includes,
  proxyCatchAll,
  anyOf,
  allOf,
  firstItem,
  lastItem,
  toString
} from '../../utilities';

import {
  PSEUDO_SELECTORS,
  COMBINATORS,
  COMBINATOR_INSERTS,
} from '../selector-types'

const keyFromSymbol      = (...args) => Symbol.keyFor(...args);
const symbolFromKey      = (...args) => Symbol.for(...args);

const asPseudoClass      = (name) => `:${name |> dasherize}`;
const asPseudoElement    = (name) => `::${name |> dasherize}`;

const asPseudoFunction = curry((name, value) => (
  `:${name |> dasherize}(${value})`
));

const descriptorObjectToString = when(isDescriptorObject).then(prop('key'));

const anythingToString = (
  when(both(isSymbol, selectorRegistry.hasDescriptor)).then(
    selectorRegistry.getDescriptor,
    prop('key')
  ).otherwise(
    descriptorObjectToString.otherwise(toString)
  )
)

const createAndStoreDescriptor = (kind, itemKey) => compose(
  selectorRegistry.addDescriptor,
  createDescriptor(kind, itemKey)
);

const createCombinator = (kind) => (...data) => {
  const stringifiedData = data |> map(anythingToString);
  const computedKey = (
    stringifiedData
    |> join(` ${COMBINATOR_INSERTS[kind]} `)
  );

  return stringifiedData |> createAndStoreDescriptor(
    kind,
    computedKey
  );
}

const joinSelectorsWith = (separator) => (data) => (
  data |> map(anythingToString) |> join(` ${separator} `)
);

const joiners = {
  all: joinSelectorsWith(COMBINATOR_INSERTS[COMBINATORS.COMBINATOR_AND]),
  any: joinSelectorsWith(COMBINATOR_INSERTS[COMBINATORS.COMBINATOR_OR])
}

const pseudoCombinators = {
  and: (...data) => (
    selectorRegistry.helpers.selectors.all(
      data,
      joiners.all(data)
    )
  ),
  or: (...data) => (
    selectorRegistry.helpers.selectors.any(
      data,
      joiners.any(data)
    )
  )
};

const asAttributeSelector = (original) => {
  const givenName = original |> dasherize;
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
    equals:        attrWithValue,
    anyOf:         anyCombinator(attrWithValue),
    contains:      attrContains,
    containsAny:   anyCombinator(attrContains),
    startsWith:    attrStartsWith,
    startsWithAny: anyCombinator(attrStartsWith),
    endsWith:      attrEndsWith,
    endsWithAny:   anyCombinator(attrEndsWith),
    toString: () => plainValue
  };

  return outerMethods;
}

const asDataAttributeSelector = compose(
  asAttributeSelector,
  concat('data-')
)

const createPropsWith = (valueCreator) => (keyList) => (
  keyList.reduce((result, key) => ({
    ...result,
    [key]: valueCreator(key)
  }), {})
);

const allPseudoClasses = PSEUDO_SELECTORS.CLASSES |> createPropsWith(asPseudoClass)
const allPseudoElements = PSEUDO_SELECTORS.ELEMENTS |> createPropsWith(asPseudoElement);
const allPseudoFunctions = PSEUDO_SELECTORS.FUNCTIONS |> createPropsWith(asPseudoFunction);

export const createStyleHelpers = ({ useProxyFeatures = false } = {}) => {
  const withPropCatcher = when(useProxyFeatures).then(proxyCatchAll)

  return {
    ...pseudoCombinators,
    ...allPseudoClasses,
    ...allPseudoFunctions,

    pseudo: (name, value) => {
      if (isDefined(value)) return asPseudoFunction(name, value);
      return asPseudoClass(name);
    },

    element: allPseudoElements,
    elementOf: asPseudoElement, // escape-hatch

    attr: asAttributeSelector |> withPropCatcher,
    data: asDataAttributeSelector |> withPropCatcher,
    prop: asPropertySelector |> withPropCatcher,

    selector: (value) => selectorRegistry.helpers.selectors.arbitrary(value),

    props: {
      any: createCombinator(COMBINATORS.PROPERTY_OR),
      all: createCombinator(COMBINATORS.PROPERTY_AND)
    }
  }
}
