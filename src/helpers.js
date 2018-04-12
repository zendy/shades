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
  when
} from './utilities';

import mq from './helpers/mq';

export const states = (selectors) => (
  Object.entries(selectors).reduce((result, [key, value]) => ({
    ...result,
    [`:${dasherize(key)}`]: value
  }), {})
);

export {
  mq
}
