import objectHash from 'object-hash';

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
  joinString,
  stateful,
  isUndefinedOrFalse,
  getLoggers,
  startsWithAny,
  firstItem,
  combineStrings,
  reduceRecord,
  mapMerge
} from './utilities';

import {
  not,
  curry,
  compose,
  startsWith,
  anyPass,
  join,
  pipe,
  unless,
  concat,
  map,
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
  equals
} from 'ramda';

// TODO:
// 1. `match` chain method for inverse patterns
// 2. Fix debug messages
// 3.

const asPseudoSelector = (key) => `:${dasherize(key)}`;
const asPseudoElement = (key) => `::${dasherize(key)}`;

const log = (...args) => console.log(...args) || true;

const isSelector         = startsWithAny('.', '#', '>');
const isAtRule           = startsWith('@');
const isPseudoSelector   = startsWith(':');
const isSelectorOrPseudo = anyPass([isSelector, isPseudoSelector]);
const isBrowserPrefixed  = startsWith('-');

const wrapContentString = (key) => when(equals('content', key)).onlyThen(JSON.stringify);

const createStyleRule = (key, value) => {
  const styleKey = key |> unless(isBrowserPrefixed, dasherize);
  const ruleValue = (
    value
    |> when(isArray).onlyThen(join(', '))
    |> wrapContentString(key)
  );

  return `${styleKey}: ${ruleValue};`;
}

const whenFunctionCallWith = (...argsToGive) => (value) => valueAsFunction(value)(...argsToGive);

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

const addToSelector = curry((selectorName, original) => (...givenRules) => ({
  ...original,
  [selectorName]: [
    ...original?.[selectorName],
    ...givenRules
  ]
}));

const combinators = (original, parentSelector, additionalCombinators) => {
  const mergeWithResult = mergeWith(concat, original);
  const mergeWithParentSelector = addToSelector(parentSelector, original);

  return {
    addRuleBlock: (givenRules) => mergeWithResult(givenRules),
    addStyle: curry((key, value) => mergeWithParentSelector(
      createStyleRule(key, value)
    )),
    addMultipleStyles: (...pairs) => mergeWithParentSelector(
      ...pairs.map(
        ([key, value]) => createStyleRule(key, value)
      )
    ),
    withSelector: (trailingSelector) => combineStrings(parentSelector, trailingSelector),
    ...additionalCombinators
  }
}

const parseStyleMetaData = (ruleResponder) => (parentSelector, props, rules) => {
  const parseNested = curry(
    (newSelector, nestedRule) => parseStyleMetaData(ruleResponder)(
      newSelector,
      props,
      nestedRule
    )
  );

  if (isFunction(rules)) return rules |> whenFunctionCallWith(props) |> parseNested(parentSelector);

  return rules |> toPairs |> reduce((result, [key, value]) => {
    const isFunctionRule   = isFunction(value);
    const hasObjectLiteral = isObjectLiteral(value);
    const hasNestedRules   = hasObjectLiteral || isFunctionRule;
    const isAtRuleBlock    = isAtRule(key) && hasNestedRules;

    const isCombiningSelector = isSelectorOrPseudo(key) && hasNestedRules;

    const isPatternBlock = (
      key === '__match'
      && hasNestedRules
    );

    const isInlinePattern = (
      hasObjectLiteral
      && !isAtRuleBlock
      && !isCombiningSelector
      && !isFunctionRule
      && !isPatternBlock
    );

    const ruleType = {
      atRule:           isAtRuleBlock,
      combinedSelector: isCombiningSelector,
      inlinePattern:    isInlinePattern,
      blockPattern:     isPatternBlock
    } |> findKeyForValue(true) |> fallbackTo('style');

    const responder = (
      combinators(result, parentSelector, { parseNested, props, parentSelector })
      |> ruleResponder[ruleType]
    );

    return responder(
      key,
      (value |> whenFunctionCallWith(props))
    ) ?? result;
  }, { [parentSelector]: [] });
}

export const parseAllStyles = parseStyleMetaData({
  atRule: ({ addRuleBlock, parseNested, parentSelector }) => (key, value) => (
    addRuleBlock({
      [key]: parseNested(parentSelector, value)
    })
  ),
  combinedSelector: ({ addRuleBlock, withSelector, parseNested }) => (key, value) => (
    addRuleBlock(
      value |> parseNested(withSelector(key))
    )
  ),
  inlinePattern: ({ addStyle, parseNested, props }) => (key, value) => {
    const { default: defaultValue, ...matchers } = value;
    const pickFromMatchers = matchers |> flip(pick);
    const intersectedMatchers = props |> keys |> pickFromMatchers;

    const computedStyle = intersectedMatchers |> iterateUntilResult(
      (key, value) => value |> whenFunctionCallWith(props[key])
    ) |> fallbackTo(defaultValue);

    return computedStyle && addStyle(key, computedStyle);
  },
  blockPattern: ({ addRuleBlock, props, parseNested, parentSelector }) => (key, propsToMatch) => {
    const matchedRules = propsToMatch |> mapMerge((targetProp, outputValue) => {
      if (props |> has(targetProp)) {
        return outputValue |> whenFunctionCallWith(props[targetProp]) |> parseNested(parentSelector);
      }
    });

    return addRuleBlock(matchedRules);
  },
  style: ({ addStyle }) => (key, value) => addStyle(key, value)
})


/**
 * stringifyRules: takes an object where the key is the selector and the value
 * is the array of rules for that selector. Returns an array of CSS rule strings.
 * @param  {object} rules   Object of selectors and values
 * @return {array<string>}  List of rules to add
 */
export const stringifyRules = (rules) => (
  Object.entries(rules).reduce((result, [key, value]) => {
    if (isArray(value)) {
      const joinedRules = joinString(...value);

      return [
        ...result,
        `${key} { ${joinedRules} }`
      ];
    }

    if (isObjectLiteral(value) && isAtRule(key)) {
      const innerRuleStrings = stringifyRules(value);
      const wrappedWithAtRules = innerRuleStrings.map(
        rule => `${key} { ${rule} }`
      );

      return [
        ...result,
        ...wrappedWithAtRules
      ];
    }

    console.error('Dude, something just tried to give me this instead of a normal rule set:', { key, value });
    return result;
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

const appendRule = curry(
  (target, rule) => {
    const index = target.cssRules.length;
    return target?.insertRule(rule, index) ?? target?.addRule(rule);
  }
);

export const parseAndStringify = pipe(
  parseAllStyles,
  stringifyRules
);

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

const css = ({ className, props = {}, target, showDebug, displayName }, styleRules) => {
  const theSheet = getSheetFor(target);
  const generatedSelector = classNameWithProps(className, props);
  const generatedClassName = generatedSelector >> asClassName;

  const alreadyCached = shadeStore.getState('cached').has(generatedClassName);

  if (alreadyCached) return generatedSelector;

  shadeStore.lift(({ addToCache }) => addToCache(generatedClassName));

  const styleString = parseAndStringify(generatedClassName, props, styleRules).forEach(
    appendRule(theSheet)
  );

  return generatedSelector;
}

export default css;
