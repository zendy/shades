import {
  prop,
  either,
  both,
  startsWith,
  concat,
  curry,
  replace,
  identity,
  pipe,
  map,
  join
} from 'ramda';

import {
  when,
  isSymbol,
  isObjectLiteral,
  getPath,
  isString,
  withMethods,
  toString,
  joinWith
} from '../utilities';

import globalScope from './global-scope';

import {
  COMBINATORS,
  COMBINATOR_INSERTS
} from '../helpers/selector-types';

export const SPECIAL_TYPES = {
  ARBITRARY_SELECTOR: 'special-types.arbitrary-selector',
  PROPERTY: {
    PREFIX: '!!',
    NAME: 'special-types.property'
  },
  DESCRIPTOR: {
    PREFIX: '__DESCRIPTOR__: '
  }
};

const addSpecialTypePrefix = (givenPrefix) => (
  when(startsWith(givenPrefix)).otherwise(concat(givenPrefix))
);

const removeSpecialTypePrefix = (givenPrefix) => (
  when(startsWith(givenPrefix)).then(replace(givenPrefix, ''))
);

const descriptorSymbol    = Symbol('Special Selector Discriptor');
const selectorRegistryKey = Symbol.for('Shades: Selector Registry');

export const isDescriptorSelector = startsWith(SPECIAL_TYPES.DESCRIPTOR.PREFIX);
export const isDescriptorObject   = (value) => !!value?.[descriptorSymbol];

export const asDescriptorIdentifier = addSpecialTypePrefix(SPECIAL_TYPES.DESCRIPTOR.PREFIX);
export const removeDescriptorPrefix = removeSpecialTypePrefix(SPECIAL_TYPES.DESCRIPTOR.PREFIX);

export const isPropertySelector = startsWith(SPECIAL_TYPES.PROPERTY.PREFIX);
export const asPropertySelector = addSpecialTypePrefix(SPECIAL_TYPES.PROPERTY.PREFIX);

export const removePropertySelectorPrefix = removeSpecialTypePrefix(SPECIAL_TYPES.PROPERTY.PREFIX);

const getDescriptorSymbol = getPath('__meta__.symbolKey');
const getDescriptorKey = prop('key');
const keySeparator = '§';
const joinKinds = joinWith(` ${keySeparator} `);

export const createDescriptor = (kind, stringIdentifier) => (value) => {
  const computedKey = (
    stringIdentifier ?? (
      value |> when(isString).otherwise(toString)
    )
  )

  const symbolKey = Symbol.for(
    joinKinds(
      kind,
      computedKey
    )
  );

  return {
    [descriptorSymbol]: true,
    key: computedKey,
    value,
    kind,
    __meta__: {
      stringIdentifier,
      symbolKey
    },
    toString: () => symbolKey
  };
};

const selectorRegistry = globalScope.getOrCreate(selectorRegistryKey, () => {
  const dataStore = new Map();

  const addDescriptor = (item) => {
    const itemKey = (
      item |> when(isDescriptorObject)
        .then(getDescriptorSymbol)
    );
    const existingItem = dataStore.get(itemKey);

    if (existingItem) return existingItem;

    dataStore.set(itemKey, item);

    //return item;
    return itemKey;
  }

  const hasDescriptor = (originalKey) => {
    const key = originalKey |> when(either(isString, isSymbol)).otherwise(toString);
    return dataStore.has(key);
  }

  const getDescriptor = (originalKey) => {
    const key = originalKey |> when(either(isString, isSymbol)).otherwise(toString);
    const result = dataStore.get(key);

    if (typeof result === 'undefined') {
      console.error('Please create a new issue on the Shades github and paste the following information in the body:', {
        dataStore,
        originalKey,
        key
      });

      throw new Error('Could not find the given descriptor in the selector store for some reason, this is probably a bug with Shades.  Please create a new issue on the Shades github, and include the output from the devtools console.');
    }

    return result;
  }

  const creator = (kind, stringifier = toString) => (value) => {
    const stringKey = stringifier(value);
    const newDescriptor = value |> createDescriptor(kind, stringKey);

    return addDescriptor(newDescriptor);
  }

  const anythingToString = (original) => {
    if (original |> isString) return original;

    if (original |> both(isSymbol, hasDescriptor)) {
      return getDescriptor(original) |> getDescriptorKey;
    }

    if (original |> isDescriptorObject) return original |> getDescriptorKey;

    return original |> toString;
  }

  const joiner = (separator) => pipe(
    map(anythingToString),
    join(` ${separator} `)
  )

  const output = dataStore |> withMethods({
    addDescriptor,
    hasDescriptor,
    getDescriptor,
    // Shortcut helpers
    helpers: {
      creator,
      selectors: {
        arbitrary: creator(SPECIAL_TYPES.ARBITRARY_SELECTOR),
        all: creator(COMBINATORS.COMBINATOR_AND, joiner('&&')),
        any: creator(COMBINATORS.COMBINATOR_OR, joiner('||'))
      },
      props: {
        create: creator(SPECIAL_TYPES.PROPERTY.NAME),
        all: creator(COMBINATORS.PROPERTY_AND, joiner('&&')),
        any: creator(COMBINATORS.PROPERTY_OR, joiner('||'))
      }
    }
  });

  return output;
})

export default selectorRegistry;
