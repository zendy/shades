import {
  compose,
  map,
  concat,
  join,
  curry,
  prop
} from 'ramda';

import {
  dasherize,
  isString,
  isSymbol,
  isNumber,
  isDefined,
  when,
  betterSet,
  includes,
  stateful,
  proxyFunction,
  proxyPropertyGetter,
  proxyGetterFunction,
  proxyRecord
} from '../utilities';

const interceptMethodCall = (methodName, interceptor) => (original) => (
  new Proxy(original, {
    get: (target, name) => {
      const originalMethod = Reflect.get(target, name);
      if (name === methodName) return (...args) => interceptor(originalMethod(...args));

      return originalMethod;
    }
  })
);

const pseudoElementNames = [
  'before',
  'after',
  'backdrop',
  'cue',
  'firstLetter',
  'firstLine',
  'grammarError',
  'placeholder',
  'selection',
  'spellingError'
];

const pseudoFunctionNames = [
  'dir',
  'lang',
  'not',
  'nthChild',
  'nthLastChild',
  'nthLastOfType',
  'nthOfType'
];

const pseudoClassNames = [
  'active',
  'any',
  'anyLink',
  'checked',
  'default',
  'disabled',
  'empty',
  'enabled',
  'first',
  'firstChild',
  'firstOfType',
  'fullscreen',
  'focus',
  'hover',
  'indeterminate',
  'inRange',
  'invalid',
  'lastChild',
  'lastOfType',
  'left',
  'link',
  'onlyChild',
  'onlyOfType',
  'optional',
  'outOfRange',
  'readOnly',
  'readWrite',
  'required',
  'right',
  'root',
  'scope',
  'target',
  'valid',
  'visited'
];

export const KINDS = {
  COMBINATOR_AND: 'combinator.and',
  COMBINATOR_OR:  'combinator.or',
  PROPERTY_AND:   'property.and',
  PROPERTY_OR:    'property.or'
};

const COMBINATOR_INSERTS = {
  [KINDS.COMBINATOR_AND]: '&&',
  [KINDS.PROPERTY_AND]:   '&&',
  [KINDS.COMBINATOR_OR]:  '||',
  [KINDS.PROPERTY_OR]:    '||'
}

const kindKey            = Symbol('Selector Kind');
const valueKey           = Symbol('Selector value');
const stringKeyProp      = Symbol('The string key thing');
const symbolKeyProp      = Symbol('The symbol of the key');
const computeSelectorSym = Symbol('Compute Selector');
const isDescriptorSym    = Symbol('Compute Selector');

const symbolProp    = (target) => (original) => original?.[target] ?? original;
const keyFromSymbol = (...args) => Symbol.keyFor(...args);
const symbolFromKey = (...args) => Symbol.for(...args);
const mapToProp     = (propName) => map(symbolProp(propName));
const joinSymbols   = (separator) => compose(
  symbolFromKey,
  join(separator),
  map(when(isSymbol).then(keyFromSymbol))
);

const asPseudoClass      = (name) => `:${name |> dasherize}`;
const asPseudoElement    = (name) => `::${name |> dasherize}`;
const asPropertySelector = (givenName) => `!!${givenName}`;
const asPseudoFunction   = curry((name, value) => (
  `:${name |> dasherize}(${value |> dasherize})`
));

const descriptorToString = when(isString).otherwise(prop('originalKey'))

const styleStore = stateful(
  new Map(),
  {
    addItem: (store, itemKey, itemValue) => store.set(itemKey, itemValue)
  }
);

export const getDescriptor = (key) => styleStore.getState(key);

const storeDescriptor = (descriptorItem) => {
  const symbolKey = descriptorItem.symbolKey;

  styleStore.lift(
    ({ addItem }) => addItem(symbolKey, descriptorItem)
  );

  return descriptorItem;
};

const createDescriptor = (kind, config = {}) => (value) => {
  const keyOrValue = config?.stringKey ?? value |> when(isString).otherwise(JSON.stringify);
  const symbolKey  = symbolFromKey(keyOrValue);

  const selfDescriptor = {
    [isDescriptorSym]:    true,
    kind,
    value,
    symbolKey,
    originalKey:          keyOrValue,
    // this toString doesnt actually return a string
    // it instead returns a symbol whose key is a string
    toString:        () => symbolKey
  };

  return selfDescriptor;
};

const createAndStoreDescriptor = (kind, config) => compose(
  storeDescriptor,
  createDescriptor(kind, config)
);

const createCombinator = (kind) => (...data) => {
  const stringKey = (
    data
    |> map(when(isString).otherwise(prop('originalKey')))
    |> join(` ${COMBINATOR_INSERTS[kind]} `)
  );

  return data |> createAndStoreDescriptor(
    kind,
    { stringKey }
  );
}

const pseudoCombinators = {
  and: createCombinator(
    KINDS.COMBINATOR_AND
  ),
  or:  createCombinator(
    KINDS.COMBINATOR_OR
  )
};

const extendedString = (extraMethods) => (originalString) => proxyRecord(extraMethods)({
  toString: () => originalString
});

const withAttribute = (givenName) => {
  const quoteString = JSON.stringify;

  const attrWithValue  = (givenValue) => `[${givenName}=${givenValue  |> quoteString}]`;
  const attrStartsWith = (givenValue) => `[${givenName}^=${givenValue |> quoteString}]`;
  const attrEndsWith   = (givenValue) => `[${givenName}$=${givenValue |> quoteString}]`;
  const attrContains   = (givenValue) => `[${givenName}*=${givenValue |> quoteString}]`;

  const anyCombinator = (mapperFn) => (...givenValues) => pseudoCombinators.or(
    ...givenValues.map(mapperFn)
  );

  const plainValue = `[${givenName}]`;

  const outerMethods = {
    anyOf:         anyCombinator(attrWithValue),
    contains:      attrContains,
    containsAny:   anyCombinator(attrContains),
    startsWith:    attrStartsWith,
    startsWithAny: anyCombinator(attrStartsWith),
    endsWith:      attrEndsWith,
    endsWithAny:   anyCombinator(attrEndsWith),
    toString: () => plainValue
  };

  return proxyFunction(
    attrWithValue,
    outerMethods
  )
}

const pseudoClassHandler = (specialChains) => (targetName) => {
  if (pseudoClassNames.includes(targetName)) {
    return targetName |> asPseudoClass;
  }

  if (pseudoFunctionNames.includes(targetName)) {
    return compose(
      asPseudoFunction(targetName),
      descriptorToString
    );
  }
  return specialChains?.[targetName];
}

const logMe = (msg) => (first, ...rest) => console.log(msg, [first, ...rest]) || first;

const style = do {
  proxyPropertyGetter(
    pseudoClassHandler({
      ...pseudoCombinators,
      element: proxyPropertyGetter(
        when(isString).then(asPseudoElement)
      ),
      pseudo: (name, value) => {
        if (isDefined(value)) return asPseudoFunction(name, value);
        return asPseudoClass(name);
      },
      data: proxyPropertyGetter(
        when(isString).then(compose(
          withAttribute,
          (value) => `data-${value}`,
          dasherize
        ))
      ),
      attr: proxyPropertyGetter(
        when(isString).then(compose(
          withAttribute,
          dasherize
        ))
      ),
      prop: proxyPropertyGetter(
        when(isString).then(asPropertySelector)
      ),
      props: ({
        any: createCombinator(KINDS.PROPERTY_OR),
        all: createCombinator(KINDS.PROPERTY_AND)
      })
    })
  )
}

// style.props.all(style.prop.specialThing, style.prop.fantastic)

export default style;
