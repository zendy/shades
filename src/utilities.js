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
   reduceWhile,
   either,
   mergeWith,
   concat,
   toPairs,
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

export const reduceRecord = (handlerFn, initialValue = {}) => (original) => (
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

export const includes = curry(
  (comparator, value) => value.includes(comparator)
);

export const noop      = ()       => {};
export const id        = (value)  => value;
export const every     = (...fns) => (...args) => allPass(fns)(...args);
// export const either    = (...fns) => (...args) => reduceWhileFalsy((result, item) => item(...args), fns);
export const firstItem = nth(0);

export const isArray            = isType('array');
export const isString           = isType('string');
export const isFunction         = isType('function');
export const isObjectLiteral    = isType('object');
export const isNumber           = isType('number');
export const isSymbol           = isType('symbol');
export const isMap              = isType('map');

export const isDefined          = complement(isNil);
export const isNotDefined       = isNil;

export const isUndefinedOrFalse = either(isNotDefined, equals(false));

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

export const proxyPropertyGetter = (genericHandler) => (
  new Proxy({}, {
    get: (target, name) => (
      genericHandler(name) ?? Reflect.get(target, name)
    )
  })
);

export const proxyFunction = (callHandler, chainHandlers) => {
  const outerProxy = new Proxy(callHandler, {
    get: (target, name) => chainHandlers?.[name] ?? Reflect.get(target, name)
  });

  return outerProxy;
};

export const proxyPassthroughFunction = (beforePassthrough) => (originalFn) => new Proxy(originalFn, {
  get: (target, name) => {
    if (Reflect.has(target, name)) beforePassthrough(name);
    return Reflect.get(target, name);
  },
  apply: (target, context, givenArgs) => {
    beforePassthrough();
    return Reflect.apply(target, context, givenArgs);
  }
});
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
    onlyThen: (...truthyHandlers) => evaluateWith(truthyHandlers),
    then: (...truthyHandlers) => proxyFunction(evaluateWith(truthyHandlers), {
      // If the predicate returns truthy, call handleTruthy with the
      // last set of arguments, otherwise call handleFalsy
      otherwise: (...falsyHandlers) => evaluateWith(truthyHandlers)(falsyHandlers)
    }),
    otherwise: (...falsyHandlers) => evaluateWith()(falsyHandlers)
    // oldOnlyThen: (...truthyHandlers) => (first, ...args) => {
    //   const callablePredicates = predicates |> map(valueAsFunction);
    //   const callableTruthyHandlers = truthyHandlers |> map(valueAsFunction);
    //
    //   const predicateChain = pipe(...callablePredicates);
    //   const handlerChain = pipe(...callableTruthyHandlers);
    //
    //   const combined = [first, ...args];
    //
    //   if (predicateChain(...combined)) {
    //     return handlerChain(...combined);
    //   }
    //
    //   return first;
    // },
  })
};

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

export const stateful = (initialValue, actions) => {
  let _internalState = initialValue;
  const reducers = Object.entries(actions).reduce((result, [name, fn]) => ({
    ...result,
    [name]: (...args) => {
      const actionResult = fn(_internalState, ...args);

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
    else if (isMap(_internalState) || _internalState?.get) {
      if (path) return _internalState.get(path);
      return _internalState;
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

const logMagenta = (...values) => tiza.bold().color('magenta')        .text(values.join(' ')).reset();
const logBlue    = (...values) => tiza.bold().color('cornflowerblue') .text(values.join(' ')).reset();
const logPurple  = (...values) => tiza.bold().color('mediumorchid')   .text(values.join(' ')).reset()
const logOrange  = (...values) => tiza.bold().color('darkorange')     .text(values.join(' ')).reset();

const logError   = () => tiza.bold().color('darkorange').text('Error: ').reset();
const logWarning = () => tiza.bold().color('mediumorchid').text('Warning: ').reset();
const logInfo    = () => tiza.bold().text('Info: ').reset();

const shadesLog = (displayName = 'Shades') => {
  const logger = logBlue('<' + displayName + '> ');

  return {
    error:   (...data) => logger.log(logError(), data.join(' ')),
    warning: (...data) => logger.log(logWarning(), data.join(' ')),
    info:    (...data) => logger.log(logError(), data.join(' '))
  }
}

const runIfEnabled = (toggleSwitch) => (callbackFn) => (...args) => {
  if (toggleSwitch) return callbackFn(...args);
}

export const getLoggers = ({ showDebug, displayName }) => {
  const runner = runIfEnabled(showDebug);
  const logger = shadesLog(displayName);

  return ({
    magenta: logMagenta,
    blue:    logBlue,
    purple:  logPurple,
    orange:  logOrange,
    matchNotFound: runner(({ ruleName }) => (
      logger.info('No pattern for ', logMagenta(ruleName), ' was matched, and no default was specified.'))
    ),
    error:   logger.error, // Errors should be displayed always
    warning: runner(logger.warning),
    info:    runner(logger.info)
  });
}

export const msg = (enabled = false) => ({
  deprecated: (titleText, originalFn) => originalFn |> proxyPassthroughFunction((propertyName) => {
    const displayTitle = safeJoinWith('.')(titleText, propertyName);
    const logger = shadesLog(`Shades#${displayTitle}`);
    logger.warning('This method is deprecated.  Please check the documentation for details.');
  })
})

export const element = (name, view) => {
  if (view) return register(name, component(view));

  const receiveComponentOrConfig = (original) => register(name, component(original));
  // Just a silly hack to let me return a function *and* revealing modules
  receiveComponentOrConfig.props = (...propNames) => (original) => (
    register(name, component(original).watchProps(...propNames))
  );

  return receiveComponentOrConfig;
}
