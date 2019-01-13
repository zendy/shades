import tiza from 'tiza';
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
   startsWith,
   anyPass,
   allPass,
   equals,
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
   nth,
   last,
   reduceWhile,
   either,
   mergeWith,
   concat,
   toPairs,
   fromPairs,
   filter
} from 'ramda';

const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' >> split('');
const LOWERCASE_LETTERS = 'abcdefghijklmnopqrstuvwxyz' >> split('');
const NUMERICS          = '0123456789'                 >> split('');

const ALPHABET          = [...UPPERCASE_LETTERS, ...LOWERCASE_LETTERS];
const ALPHANUMERIC      = [...ALPHABET,          ...NUMERICS];

export const isType = curry(
  (expected, value) => toLower(type(value)) === toLower(expected)
);

export const isFalsy = (value) => !value;

export const reduceWhileFalsy = curry(
  (handlerFn, list) => reduceWhile(isFalsy, handlerFn, false, list)
);

export const reduceRecord = (initialValue) => (handlerFn) => (original) => (
  original |>
  toPairs |>
  reduce(
    (result, currentPair) => handlerFn(result, currentPair) || result,
    initialValue
  )
);

export const mapMerge = curry(
  (handlerFn, original) => (
    original |>
    toPairs |>
    reduce(
      (result, [key, value]) => {
        const combiner = mergeWith(concat, result);
        const handlerOutput = handlerFn(key, value);

        const newResult = handlerOutput && combiner(handlerOutput);

        return newResult || result;
      },
      {}
    )
  )
);

export const mapFilterRecord = (handlerFn, original) => (
  original |> toPairs |> reduce(
    (result, [key, value]) => {
      const outputItem = handlerFn(key, value);

      const newResult = outputItem && [
        ...result,
        outputItem
      ];

      return newResult || result;
    },
    []
  )
);

export const toString = (original) => original.toString();

export const includes = contains;

export const includedIn = flip(contains);

export const anyOf = (...predicates) => (valueToCheck) => anyPass(predicates, valueToCheck);
export const allOf = (...predicates) => (valueToCheck) => allPass(predicates, valueToCheck);

export const noop      = ()       => {};
export const id        = (value)  => value;
export const firstItem = nth(0);
export const lastItem = last;
export const negate = (original) => !original;

export const isArray            = isType('array');
export const isString           = isType('string');
export const isFunction         = isType('function');
export const isObjectLiteral    = isType('object');
export const isNumber           = isType('number');
export const isSymbol           = isType('symbol');
export const isMap              = isType('map');
export const isIterable = (original) => Reflect.has(original, Symbol.iterator);

export const isDefined          = complement(isNil);
export const isNotDefined       = isNil;

export const isUndefinedOrFalse = either(isNotDefined, equals(false));
export const isFalse            = equals(false);
export const isNotFalse         = complement(isFalse);

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
export const startsWithAny      = (...searchStrs) => searchStrs >> map(startsWith) >> anyPass
export const combineStrings     = (...inputs) => inputs.filter(Boolean).join('');

export const safeJoinWith = (separator) => (...args) => (
  args |> when(firstItem, isArray).then(firstItem) |> filter(Boolean) |> join(separator)
)

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

export const proxyPropertyGetter = (genericHandler, originalValue = {}) => (
  new Proxy(originalValue, {
    get: (target, name) => (
      Reflect.get(target, name) ?? genericHandler(name)
    )
  })
);

export const proxyCatchAll = (catchAllHandler, originalValue = {}) => (
  new Proxy(originalValue, {
    get: (target, name) => (
      Reflect.get(target, name) ?? catchAllHandler(name)
    )
  })
);

export const withMethods = (handlerCreator) => (originalValue) => {
  const handlers = originalValue |> valueAsFunction(handlerCreator);

  const wrapper = (...args) => originalValue(...args);
  // We had to move away from proxies unfortunately, for IE11 compatibility
  // The following will apply both the handler object and the original
  // value's enumerable properties to the new wrapper. This will mean
  // that values with existing own properties (like React components)
  // will still work.
  return Object.assign(wrapper, handlers, originalValue);
}

// Conditional chain expression :) stop using if & else, just use this.
// Usage: ```
// const actuallyDoTheThing = (value) => value + " is more than nothing";
// const trySomethingElse = (value) => "I dunno what '" + value + "' is, sorry!";
// const doSomething = when(value => value === "something").then(actuallyDoTheThing).otherwise(trySomethingElse)
// doSomething("something"); // "something is more than nothing"
// doSomething("not something") // => "I dunno what 'not something' is. sorry!"
// ```
const convertAndPipe = (values) => {
  const callableValues = values |> map(valueAsFunction);
  return pipe(...callableValues);
}

export const when = (...predicates) => {
  const evaluateWith = (handleTruthy = [id]) => (handleFalsy = [id]) => (...args) => {
    const predicateChain  = predicates   |> convertAndPipe;
    const truthyChain     = handleTruthy |> convertAndPipe;
    const falsyChain      = handleFalsy  |> convertAndPipe;

    if (predicateChain(...args)) {
      return truthyChain(...args);
    }

    return falsyChain(...args);
  }

  return ({
    // If predicate doesnt retun a truthy value, then just return the first
    // argument given to the whole expression
    onlyThen: (...truthyHandlers) => evaluateWith(truthyHandlers)(),
    then: (...truthyHandlers) => evaluateWith(truthyHandlers)() |> withMethods({
      // If the predicate returns truthy, call handleTruthy with the
      // last set of arguments, otherwise call handleFalsy
      otherwise: (...falsyHandlers) => evaluateWith(truthyHandlers)(falsyHandlers)
    }),
    otherwise: (...falsyHandlers) => evaluateWith()(falsyHandlers)
  })
};

export const not = when(isFunction).then(complement).otherwise(negate);

export const dotPath = curry(
  (pathStr, target) => target >> path(pathStr >> split('.'))
);

export const betterSet = (initialData = []) => {
  const internal = new Set(initialData);

  const outerMethods = {
    add:     (...items) => items.forEach(item => internal.add(item)) || outerMethods,
    remove:  (...items) => items.forEach(item => internal.delete(item)) || outerMethods,
    forEach: (...args) => internal.forEach(...args) || outerMethods,
    clear:   () => internal.clear() && outerMethods,
    has:     (...args) => internal.has(...args),
    map:     (mapFn) => [...internal].map(mapFn) |> betterSet,
    filter:  (filterFn) => [...internal].filter(filterFn) |> betterSet,
    reduce:  (reduceFn, initialValue) => [...internal].reduce(reduceFn, initialValue),
    get size() {
      return internal.size;
    },
    toArray: () => Array.from(internal)
  }

  return outerMethods;
};

const joinArgs = (originalFn) => (...items) => items |> join(' ') |> originalFn;

const logColours = (
  {
    green:   '#54d267',
    red:     '#ca1e39',
    orange:  '#ea821f',
    magenta: '#ff6dfd',
    purple:  '#b06dff',
    blue:    '#60a3ff',
    gray:    '#c2c2c2'
  } |> toPairs |> map(([colourName, colourHex]) => ([
    colourName,
    tiza.bold().color(colourHex).text
  ])) |> fromPairs
);

const isProduction    = process?.env?.NODE_ENV === 'production';
const isTest          = process?.env?.NODE_ENV === 'test';
const shouldShowDebug = !isProduction && !isTest;

export const shadesLog = (displayName = 'Shades') => {
  const makeLogTitle = (original) => logColours.gray('<', original |> logColours.blue, '> ');
  const logTitle = makeLogTitle(displayName);

  return {
    ...logColours,
    error:   (...data) => {
      logTitle.log(
        'Error:' |> logColours.red,
        ...data
      );

      return new Error(...data);
    },
    warning: (...data) => shouldShowDebug && logTitle.log(
      'Warning: ' |> logColours.orange,
      ...data
    ),
    info:    (...data) => shouldShowDebug && logTitle.log(
      'Info: ' |> logColours.blue,
      ...data
    ),
    deprecated: curry((originalName, originalFn) => originalFn |> when(shouldShowDebug).then(
      (fnToWrap) => (...args) => {
        makeLogTitle(displayName).log(
          logColours.orange('Deprecation warning: '),
          logColours.purple(originalName), ' is deprecated.  Please check the documentation for more details.'
        );

        return fnToWrap(...args);
      }
    )),
    deprecatedAlternative: curry(
      (originalName, alternativeName, originalFn) => originalFn |> when(shouldShowDebug).then(
        (fnToWrap) => (...args) => {
          makeLogTitle(displayName).log(
            logColours.orange('Deprecation warning: '),
            logColours.purple(originalName), ' is deprecated and has been replaced by ', logColours.purple(alternativeName), '.  Please check the documentation for more details.'
          )

          return fnToWrap(...args);
        }
      )
    )
  }
}

const runIfEnabled = (toggleSwitch) => (callbackFn) => (...args) => {
  if (toggleSwitch) return callbackFn(...args);
}

export const getLoggers = ({ debug, displayName }) => {
  const runner = runIfEnabled(debug);
  const logger = shadesLog(displayName);

  return ({
    ...logColours,
    error:   logger.error, // Errors should be displayed always
    warning: runner(logger.warning),
    info:    runner(logger.info)
  });
}
