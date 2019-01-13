import {
  prop,
  either,
  both,
  startsWith,
  concat,
  curry,
  replace
} from 'ramda';

import {
  when,
  isSymbol,
  isObjectLiteral,
  isString,
  withMethods,
  toString,
  startsWithAny
} from '../utilities';

import globalScope from './global-scope';

export const SPECIAL_TYPES = {
  PROPERTY: {
    PREFIX: '!!'
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

export const createDescriptor = (kind, stringIdentifier) => (value) => {
  const computedKey = (
    stringIdentifier ?? (
      value |> when(isString).otherwise(toString)
    )
  )

  return {
    [descriptorSymbol]: true,
    kind,
    value,
    key: computedKey,
    __meta__: {
      stringIdentifier,
      computedKey
    },
    toString: () => computedKey |> asDescriptorIdentifier
  }
}

const selectorRegistry = globalScope.getOrCreate(selectorRegistryKey, () => {
  const dataStore = new Map();

  const output = dataStore |> withMethods({
    addDescriptor: (item) => {
      const itemKey = item.toString();
      const existingItem = dataStore.get(itemKey);

      if (existingItem) return existingItem;

      dataStore.set(itemKey, item);

      return item;
    },
    getDescriptor: (originalKey) => {
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
  });

  return output;
})

export default selectorRegistry;
