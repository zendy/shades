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
  msg,
  shadesLog
} from './utilities';

import mq from './helpers/mq';
import style from './helpers/style';

const logger = shadesLog('Shades#helpers');
export const states = do {
  const normalFn = logger.deprecated('states', (selectors) => {
    return Object.entries(selectors).reduce((result, [key, value]) => ({
      ...result,
      [`:${dasherize(key)}`]: value
    }), {});
  })

  normalFn.all = (...selectors) => (styleRules) => selectors |> reduce((result, currentSelector) => ({
    ...result,
    [`:${dasherize(currentSelector)}`]: styleRules
  }), {});

  normalFn;
}

export {
  mq,
  style
}
