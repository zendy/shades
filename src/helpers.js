import { dasherize } from './utilities';

export const states = (selectors) => (
  Object.entries(selectors).reduce((result, [key, value]) => ({
    ...result,
    [`:${dasherize(key)}`]: value
  }), {})
);
