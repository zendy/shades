import objectHash from 'object-hash';

import {
  OrderedMap
} from 'immutable';

import {
  dasherize,
  when,
  valueAsFunction,
  isObjectLiteral,
  isArray,
  isNotArray,
  isString,
  isFunction,
  isDefined,
  isNumber,
  isSymbol,
  joinString,
  stateful,
  isUndefinedOrFalse,
  getLoggers,
  prettyLogs,
  shadesLog,
  startsWithAny,
  firstItem,
  combineStrings,
  reduceRecord,
  mapMerge,
  getSubstringAfter
} from './utilities';

import {
  not,
  curry,
  compose,
  startsWith,
  anyPass,
  join,
  split,
  pipe,
  unless,
  concat,
  map,
  chain,
  flip,
  defaultTo,
  reduceWhile,
  toPairs,
  reduce,
  find,
  pick,
  keys,
  has,
  merge,
  mergeWith,
  equals,
  last,
  forEach,
  all,
  type
} from 'ramda';

import { getDescriptor, KINDS } from './helpers/style';

const asPseudoSelector = (key) => `:${dasherize(key)}`;
const asPseudoElement = (key) => `::${dasherize(key)}`;
const isOneOf = (...availableItems) => (givenItem) => availableItems.includes(givenItem);
const mergeLeft = flip(merge);
const toLog = (...msgs) => (first, ...rest) => console.log(...msgs, [first, ...rest]) || first;
const toString = (value) => value.toString();

const parserLog = shadesLog('Shades#parser');

const stopRightThereCriminalScum = (validTypes, givenKey) => (givenValue) => {
  parserLog.error(
    `Shades could not parse the style for ${givenKey |> prettyLogs.purple} because the provided value type (${givenValue |> type |> prettyLogs.red}) does not match any valid types (${validTypes |> map(prettyLogs.green) |> join(', ')})`
  );

  throw new TypeError(
  `Shades could not parse the style for ${givenKey} because the provided value type (${givenValue |> type}) does not match any valid types (${validTypes |> join(', ')})`
);
}

const isSelector         = startsWithAny('.', '#', '>');
const isAtRule           = startsWith('@');
const isPseudoSelector   = startsWith(':');
const isPropertySelector = startsWith('!!');
const isSelectorOrPseudo = anyPass([isSelector, isPseudoSelector]);
const isBrowserPrefixed  = startsWith('-');
const isPseudoElement    = isOneOf(
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
);

// Special property selectors typically start with !!, so this removes those
const stripPropertyBangs = when(isPropertySelector).then(getSubstringAfter(2))

const wrapContentString = (key) => when(equals('content', key)).then(JSON.stringify);

const whenFunctionCallWith = (...argsToGive) => when(isFunction).then((fnItem) => fnItem(...argsToGive));

const falseToNull = (value) => {
  if (value === false) return null;
  return value;
}

const fallbackTo = (fallback) => compose(
  defaultTo(fallback),
  falseToNull
);

const findKeyForValue = (needle, fallback) => (haystack) => (
  haystack |>
  toPairs |>
  find(([key, value]) => value === needle) |>
  defaultTo([fallback, true]) |>
  firstItem
);

const iterateUntilResult = curry(
  (computeFn, list) => {
    const reduceWhileInvalid = (iterateFn) => reduceWhile(isUndefinedOrFalse, iterateFn, false);
    const iterateObject = reduceWhileInvalid(
      (previous, [key, value]) => computeFn(key, value)
    );
    const iterateList = reduceWhileInvalid(
      (previous, current) => computeFn(current)
    );

    if (list |> isObjectLiteral) return list |> toPairs |> iterateObject;

    return list |> iterateList;
  }
);

const addToSelector = curry((selectorName, original) => (givenRules) => ({
  ...original,
  [selectorName]: {
    ...(original?.[selectorName] ?? {}),
    ...givenRules
  }
}));

const createStyleProperty = curry((key, value) => {
  if (!isDefined(value)) console.error('createStyleProperty: value not defined!', { key, value });
  const ruleKey = (
    key
    |> unless(isBrowserPrefixed, dasherize)
  );

  const ruleValue = (
    value
    |> when(isArray).then(join(', '))
    |> wrapContentString(key)
  );

  return {
    [ruleKey]: ruleValue
  };
})

const appendWith = (lastValue) => (firstValue) => [firstValue, lastValue].join('');

// type StyleRules = { [Selector] :: { [RuleName] :: RuleValue } }
const combinators = (parentSelector, { props, ...extraCombinators }) => (results) => {
  const mergeWithResult = (additionalRules) => results.mergeDeep(additionalRules);
  const mergeWithParentSelector = (additionalRules) => results.mergeIn([parentSelector], additionalRules);
  const addToSelector = curry((targetSelector, additionalRules) => (
    results.update(
      targetSelector,
      when(isDefined).then(mergeLeft(additionalRules)).otherwise(additionalRules)
    )
  ));

  return {
    // addRuleBlock :: StyleRules -> StyleRules
    addAtRule: curry((atRuleKey, nestedMap) => results.update(
      atRuleKey,
      (original) => {
        if (original) return original.mergeDeep(nestedMap)
        return nestedMap;
      }
    )),
    addRuleBlock: curry((targetSelector, givenRules) => givenRules |> addToSelector(targetSelector)),
    // addStyle :: RuleName -> RuleValue -> StyleRules
    addStyle: curry((key, value) => compose(
      addToSelector(parentSelector),
      createStyleProperty
    )(key, value)),
    // extendSelector :: SelectorFragment -> Selector
    extendSelector: (trailingSelector) => parentSelector |> map(appendWith(trailingSelector)),
    // pseudoElementSelector :: String -> Selector PseudoSelector
    pseudoElementSelector: (pseudoName) => parentSelector |> map(appendWith(asPseudoElement(pseudoName))),
    propExists: (targetProp) => has(stripPropertyBangs(targetProp), props),
    props,
    results,
    ...extraCombinators
  }
}

const parseStyleMetaData = (ruleResponder) => {
  const styleParser = ({ parentSelector, props, initialResult = OrderedMap() }) => (rules) => {
    const parseNestedWithResult = curry((givenResult, givenSelectors, givenNestedRules) => (
      styleParser({
        parentSelector: givenSelectors,
        initialResult: givenResult,
        props
      })(givenNestedRules)
    ));

    if (isFunction(rules)) return rules |> whenFunctionCallWith(props) |> parseNestedWithResult(initialResult, parentSelector);

    const asNewParser = parseNestedWithResult(OrderedMap());

    // evaluateRule :: ParsedStyles Selector -> StyleKey -> StyleValue -> ParsedStyles Selecctor
    const evaluateRule = (result) => (key, value) => {
      const getCombinatorsFor = combinators(parentSelector, {
        props,
        parentSelector,
        reevaluate: curry((key, value) => evaluateRule(result)(key, value)),
        parseNestedWithResult,
        parseNested: parseNestedWithResult(result),
        reduceNested: (handler) => reduceRecord(result)(
          (accumulated, [key, value]) => {
            const parseNestedReduced = (valueToParse) => parseNestedWithResult(accumulated, parentSelector, valueToParse);
            return handler(parseNestedReduced)(key, value) || accumulated;
          }
        ),
        asNewParser
      });

      const isStyleSymbol    = isSymbol(key);
      const isFunctionRule   = isFunction(value);
      const hasObjectLiteral = isObjectLiteral(value);
      const hasNestedRules   = hasObjectLiteral || isFunctionRule;

      const isPropertyMatch       = isPropertySelector(key) && hasNestedRules;
      const isAtRuleBlock         = isAtRule(key)           && hasNestedRules;
      const isCombiningSelector   = isSelectorOrPseudo(key) && hasNestedRules;
      const shouldBePseudoElement = isPseudoElement(key)    && hasNestedRules;

      const isPatternBlock = (
        key === '__match'
        && hasNestedRules
      );

      const isInlinePattern = (
        hasObjectLiteral
      );

      const ruleType = {
        styleSymbol:      isStyleSymbol,
        propertyMatch:    isPropertyMatch,
        atRule:           isAtRuleBlock,
        combinedSelector: isCombiningSelector,
        pseudoElement:    shouldBePseudoElement,
        blockPattern:     isPatternBlock,
        inlinePattern:    isInlinePattern
      } |> findKeyForValue(true) |> fallbackTo('style');

      const responder = (
        getCombinatorsFor(result) |> ruleResponder[ruleType]
      );

      return responder(
        key,
        value
      ) || result;
    }

    const symbolRules = Object.getOwnPropertySymbols(rules) |> map((sym) => ([
      sym,
      rules[sym]
    ]))

    return (
      rules
      |> toPairs
      |> concat(symbolRules)
      |> reduce(
        (result, [key, value]) => evaluateRule(result)(key, value),
        initialResult
      )
    );
  }

  return styleParser;
}

export const parseAllStyles = parseStyleMetaData({
  atRule: ({ addRuleBlock, parseNested, parentSelector, addAtRule, asNewParser }) => (key, value) => (
    addAtRule(
      key,
      value |> asNewParser(parentSelector)
    )
  ),
  combinedSelector: ({ addRuleBlock, extendSelector, parseNested }) => (extraSelector, extraRules) => {
    const newSelectors = extendSelector(extraSelector);
    return extraRules |> parseNested(newSelectors)
  },
  pseudoElement: ({ addRuleBlock, pseudoElementSelector, parseNested }) => (pseudoName, nestedRules) => {
    const newSelectors = pseudoElementSelector(pseudoName);
    return nestedRules |> parseNested(newSelectors)
  },
  blockPattern: ({ parseNestedWithResult, props, results, parentSelector }) => (unneededKey, propsToMatch) => (
    propsToMatch |> toPairs |> reduce((accumulated, [propName, rulesForProp]) => {
      if (props |> has(propName)) return (
        rulesForProp
        |> whenFunctionCallWith(props[propName])
        |> parseNestedWithResult(accumulated, parentSelector)
      );
      return accumulated;
    }, results)
  ),
  inlinePattern: ({ addStyle, parseNested, props }) => (key, value) => {
    const {
      default: defaultValue,
      ...matchers
    } = value;

    const pickFromMatchers    = matchers |> flip(pick);
    const intersectedMatchers = props |> keys |> pickFromMatchers;

    const computedStyle = intersectedMatchers |> iterateUntilResult(
      (key, value) => value |> whenFunctionCallWith(props[key])
    ) |> fallbackTo(defaultValue);

    return computedStyle && addStyle(key, computedStyle);
  },
  propertyMatch: ({ addRuleBlock, parseNested, parentSelector, props, propExists }) => (key, value) => {
    const propName = key |> stripPropertyBangs;

    if (propName |> propExists) return (
      value
      |> whenFunctionCallWith(props[propName])
      |> parseNested(parentSelector)
    )
  },
  styleSymbol: ({ addRuleBlock, extendSelector, props, parseNested, parentSelector, propExists }) => (
    (symbolKey, styleBlock) => {
      const parseStyleBlockWith = (argsToPass) => (selector) => (
        styleBlock
        |> whenFunctionCallWith(argsToPass)
        |> parseNested(selector)
      );

      const handlers = {
        [KINDS.PROPERTY_OR]: (targetProps) => {
          if (targetProps |> find(propExists)) return (
            parentSelector |> parseStyleBlockWith(props)
          )
        },
        [KINDS.PROPERTY_AND]: (targetProps) => {
          if (targetProps |> all(propExists)) return (
            parentSelector |> parseStyleBlockWith(props)
          )
        },
        [KINDS.COMBINATOR_OR]: (targetAttrs) => (
          targetAttrs |> chain(extendSelector) |> (
            parseStyleBlockWith(props)
          )
        ),
        [KINDS.COMBINATOR_AND]: (targetAttrs) => (
          targetAttrs |> join('') |> extendSelector |> (
            parseStyleBlockWith(props)
          )
        )
      }

      const { kind, value } = getDescriptor(symbolKey);

      return handlers?.[kind]?.(value);
    }
  ),
  style: ({ addStyle, props, reevaluate, parentSelector }) => (ruleName, value) => (
    value
    |> whenFunctionCallWith(props)
    |> when(isUndefinedOrFalse).otherwise(
      // The following line is for cases where a function returns
      // inline pattern matching blocks
      when(isObjectLiteral).then(reevaluate(ruleName)).otherwise(
        when(isArray).then(join(', ')),
        when(isNumber).then(toString),
        when(isString).then(addStyle(ruleName)).otherwise(
          stopRightThereCriminalScum([
            'Object',
            'Array',
            'Number',
            'String'
          ], ruleName)
        )
      )
    )
  )
})


/**
 * stringifyRules: takes an object where the key is the selector and the value
 * is the array of rules for that selector. Returns an array of CSS rule strings.
 * @param  {object} rules   Object of selectors and values
 * @return {array<string>}  List of rules to add
 */
export const stringifyRules = (rules) => (
  rules.entries() |> reduce((result, [selectors, styleRules]) => {
    if (selectors |> isAtRule) {
      const innerRuleStrings = stringifyRules(styleRules);
      const wrappedWithAtRules = innerRuleStrings.map(
        rule => `${selectors} { ${rule} }`
      );

      return [
        ...result,
        ...wrappedWithAtRules
      ];
    }
    const createRuleString = ([key, value]) => `${key}: ${value};`;
    const joinedRules = styleRules |> toPairs |> map(createRuleString) |> join('');

    return [
      ...result,
      `${selectors} { ${joinedRules} }`
    ];
  }, [])
);

const asClassName = unless(startsWith('.'), concat('.'));

const createAndInsertStylesheet = (tagName, target, after) => {
  const newElem = document.createElement(tagName);
  if (after) after(newElem); // ewwwwww I'm so sorry
  return target.appendChild(newElem);
};

const getSheetFor = (target) => {
  const funnyName = 'data-shades';
  const styleEl = (
    target.querySelector(`[${funnyName}]`) ||
    createAndInsertStylesheet(
      'style',
      target,
      elem => elem.setAttribute(funnyName, true)
    )
  );

  return styleEl.sheet;
};

const classNameWithProps = (baseClassName, props) => {
  const propHash = objectHash(props);
  return [baseClassName, propHash].join('-');
}

const computeClassnameHash = (...data) => objectHash(data);

const appendRule = curry(
  (target, rule) => {
    const index = target.cssRules.length;
    return target?.insertRule(rule, index) ?? target?.addRule(rule);
  }
);

export const parseAndStringify = (value) => value;

const shadeStore = stateful({
  index: 1,
  cached: new Map()
}, {
  increment: ({ index }) => ({ index: index + 1 }),
  addToCache: ({ cached }, item) => ({ cached: cached.set(item, true) })
});

export const generateClassName = () => {
  const currentIndex = shadeStore.getState('index');
  const newClassName =  (
    ['shades', currentIndex.toString(36)].join('-')
  );

  shadeStore.lift(({ increment }) => increment());

  return newClassName;
}

export const css = ({ className, props = {}, target, showDebug, displayName }, styleRules) => {
  const theSheet = getSheetFor(target);
  const computedSelectorString = [
    className,
    computeClassnameHash(className, styleRules, props)
  ].join('-');

  const isAlreadyCached = shadeStore.getState('cached').has(computedSelectorString);

  if (isAlreadyCached) return computedSelectorString;

  shadeStore.lift(({ addToCache }) => addToCache(computedSelectorString));

  const styleString = (
    styleRules
    |> parseAllStyles({ parentSelector: [computedSelectorString |> asClassName], props })
    |> stringifyRules
    |> forEach(
      appendRule(theSheet)
    )
  );

  return computedSelectorString;
}
