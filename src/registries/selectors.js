import {
  prop
} from 'ramda';

import {
  stateful,
  when,
  isSymbol,
  withMethods
} from '../utilities';

import globalScope from './global-scope';

const selectorRegistryKey = Symbol.for('Shades: Selector Registry');

const selectorRegistry = globalScope.getOrCreate(selectorRegistryKey, () => {
  const dataStore = new Map();

  const output = dataStore |> withMethods({
    addDescriptor: (item) => {
      const { symbolKey } = item;
      const existingItem = dataStore.get(symbolKey);

      if (existingItem) return existingItem;

      dataStore.set(symbolKey, item);

      return item;
    },
    getDescriptor: (value) => {
      const key = value |> when(isSymbol).otherwise(prop('symbolKey'));
      const result = dataStore.get(key);

      if (typeof result === 'undefined') {
        console.error('Please create a new issue on the Shades github and paste the following information in the body:', {
          value,
          key,
          dataStore
        });

        throw new Error('Could not find the given descriptor in the selector store for some reason, this is probably a bug with Shades.  Please create a new issue on the Shades github, and include the output from the devtools console.');
      }

      return result;
    }
  });

  return output;
})

export default selectorRegistry;
