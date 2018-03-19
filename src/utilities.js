import {
   curry,
   curryN,
   pipe,
   compose,
   type,
   isNil,
   complement,
   toLower,
   toUpper,
   anyPass,
   allPass,
   contains,
   map,
   reduce,
   useWith,
   has,
   path,
   join,
   splitAt,
   split,
   flip,
   find,
   nth
} from 'ramda';

const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' >> split('');
const LOWERCASE_LETTERS = 'abcdefghijklmnopqrstuvwxyz' >> split('');
const NUMERICS          = '0123456789'                 >> split('');

const ALPHABET          = [...UPPERCASE_LETTERS, ...LOWERCASE_LETTERS];
const ALPHANUMERIC      = [...ALPHABET,          ...NUMERICS];

export const isType = curry(
  (expected, value) => toLower(type(value)) === toLower(expected)
);

export const reduceWhileFalsy = curry(
  (handlerFn, list) => reduceWhile(isFalsy, handlerFn, false, list)
);

export const includes = curry(
  (comparator, value) => value.includes(comparator)
);

export const noop      = ()       => {};
export const id        = (value)  => value;
export const every     = (...fns) => (...args) => allPass(fns)(...args);
export const either    = (...fns) => (...args) => reduceWhileFalsy((result, item) => item(...args), fns);
export const firstItem = nth(0);

export const isArray            = isType('array');
export const isString           = isType('string');
export const isFunction         = isType('function');
export const isObjectLiteral    = isType('object');

export const isDefined          = complement(isNil);
export const isNotDefined       = isNil;

export const isNotArray         = complement(isArray);
export const isNotString        = complement(isString);
export const isNotFunction      = complement(isFunction);
export const isNotObjectLiteral = complement(isObjectLiteral);

export const sliceFromFirstChar = splitAt(1);
export const reduceToString     = curry((reduceFn, list) => reduce(reduceFn, '', list));
export const returnAsIs         = (value)      => value;
export const joinWith           = (...values)  => (separator)  => values.join(separator);
export const getSubstring       = (start, end) => (original)   => original.substring(start, end);
export const getSubstringUntil  = (end)        => getSubstring(0, end);
export const getSubstringAfter  = (start)      => getSubstring(start);

export const joinString = (first, ...items) => {
  if (first >> isArray) return first >> join('');
  return [first, ...items] >> join('');
}

export const mapJoin = curry(
  (mapFn, original) => original >> reduceToString(
    useWith(joinString, [id, mapFn])
  )
);

export const capitalise = (original) => {
  if (original.length <= 1) return original >> toUpper;

  return useWith(joinString, [toUpper, id])(
    ...sliceFromFirstChar(original)
  );
};

export const unCapitalise = (original) => useWith(joinString, [toLower, id])(
  ...sliceFromFirstChar(original)
);


export const startsWithCapital = (original) => (
  UPPERCASE_LETTERS >> contains(original >> sliceFromFirstChar >> firstItem)
);

const splitAndCamelise = (...separators) => (original) => {
  return separators >> reduce((result, item) => {
    const [first, ...rest] = result >> split(item);

    return (first, rest) >> useWith(joinString, [id, mapJoin(capitalise)]);
  }, original);
}

export const toCamelCase = (original) => {
  if (original.length <= 1) return toLower(original);

  return original >> splitAndCamelise('-', '_', ' ') >> unCapitalise;
}

export const dasherize = (original) => (
  original.trim()
    .replace(/([A-Z])/g, '-$1')
    .replace(/[-_\s]+/g, '-')
    .toLowerCase()
);

// Takes any value, and if the value is not a function, return a new function that
// always returns that value; otherwise, if the value is already a function, just return it.
export const valueAsFunction = value => {
  if (!isFunction(value)) return () => value;
  return value;
};

// Conditional chain expression :) stop using if & else, just use this.
// Usage: ```
// const actuallyDoTheThing = (value) => value + " is more than nothing";
// const trySomethingElse = (value) => "I dunno what '" + value + "' is, sorry!";
// const doSomething = when(value => value === "something").then(actuallyDoTheThing).otherwise(trySomethingElse)
// doSomething("something"); // "something is more than nothing"
// doSomething("not something") // => "I dunno what 'not something' is. sorry!"
// ```
export const when = (predicate) => ({
  // If predicate doesnt retun a truthy value, then just return the first
  // argument given to the whole expression
  onlyThen: (...truthyHandlers) => (first, ...args) => {
    const callablePredicate = valueAsFunction(predicate);
    const combined = [first, ...args];

    if (callablePredicate(...combined)) {
      return pipe(...truthyHandlers)(...combined);
    }

    return first;
  },
  then: (...truthyHandlers) => ({

    orNot: () => (first, ...args) => {
      const callablePredicate = valueAsFunction(predicate);
      const combined = [first, ...args];

      if (callablePredicate(...combined)) {
        return pipe(...truthyHandlers)(...combined);
      }

      return first;
    },
    // If the predicate returns truthy, call handleTruthy with the
    // last set of arguments, otherwise call handleFalsy
    otherwise: (...falsyHandlers) => (...args) => {
      const callablePredicate = valueAsFunction(predicate);

      if (callablePredicate(...args)) {
        return pipe(...truthyHandlers.map(valueAsFunction))(...args);
      }

      return pipe(...falsyHandlers.map(valueAsFunction))(...args);
    }
  })
});

export const dotPath = curry(
  (pathStr, target) => target >> path(pathStr >> split('.'))
);

export const match = (matchers, fallback = id) => (value) => {
  const goodValue = isDefined(value);
  if (!goodValue) return fallback(value);

  const hasMatcher = has(value, matchers);
  if (!hasMatcher) return fallback(value);

  return matchers[value](value);
}

export const stateful = (initialValue, actions) => {
  let _internalState = initialValue;
  const reducers = Object.entries(actions).reduce((result, [name, fn]) => ({
    ...result,
    [name]: (...args) => {
      const actionResult = actions[name](_internalState, ...args);

      if (isObjectLiteral(_internalState)) {
        const nextState = {
          ..._internalState,
          ...actionResult
        }
        _internalState = nextState;
        return nextState;
      }

      _internalState = actionResult;
      return actionResult;
    }
  }), {});

  const getState = (path) => {
    if (isObjectLiteral(_internalState)) {
      const clonedState = { ..._internalState };

      if (path) return dotPath(path, clonedState);

      return clonedState;
    }

    return _internalState;
  };

  const innerSelf = {
    lift: (handler) => {
      handler(reducers, getState);
      return innerSelf;
    },
    getState
  }

  return innerSelf;
}
