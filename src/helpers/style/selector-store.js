import {
  prop
} from 'ramda';

import {
  stateful,
  when,
  isSymbol
} from '../../utilities';

const storeValueGlobally = (name) => (value) => {
  const scope = global ?? window;

  if (scope?.[name]) return scope[name];

  scope[name] = value;

  return value;
}

const styleStoreKey = Symbol.for('Shades: style selector store');

const styleStore = stateful(
  new Map(),
  {
    addItem: (store, itemKey, itemValue) => store.set(itemKey, itemValue)
  }
) |> storeValueGlobally(styleStoreKey);

export const getDescriptor = (key) => {
  const stateKey = key |> when(isSymbol).otherwise(prop('symbolKey'));
  const output = styleStore.getState(stateKey);

  if (!output) console.error('Could not find that key in the store for some reason', { key, stateKey, store: styleStore.getState(), output })

  return output;
}

export default styleStore;
