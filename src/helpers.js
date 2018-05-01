import {
  map,
  reduce,
  toPairs,
  fromPairs,
  toLower,
  contains,
  curry,
  mergeAll
} from 'ramda';

import {
  dasherize,
  isString,
  isNumber,
  when,
  msg
} from './utilities';

import mq from './helpers/mq';

export const states = do {
  const normalFn = (selectors) => {
    return Object.entries(selectors).reduce((result, [key, value]) => ({
      ...result,
      [`:${dasherize(key)}`]: value
    }), {});
  }

  normalFn.all = (...selectors) => (styleRules) => selectors |> reduce((result, currentSelector) => ({
    ...result,
    [`:${dasherize(currentSelector)}`]: styleRules
  }), {});

  msg().deprecated('states', normalFn);
}

export {
  mq
}
