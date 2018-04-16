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
  combineStrings
} from './utilities';

import {
  type,
  isNil,
  not,
  curry,
  compose,
  toLower,
  startsWith,
  anyPass,
  join,
  pipe,
  complement,
  unless,
  concat,
  map,
  flip,
  contains,
  defaultTo,
  intersection,
  reduceWhile,
  toPairs,
  reduce,
  find,
  pick,
  keys
} from 'ramda';

// TODO:
// 1. `match` chain method for inverse patterns
// 2. Fix debug messages
// 3.

const asPseudoSelector = (key) => `:${dasherize(key)}`;
const asPseudoElement = (key) => `::${dasherize(key)}`;

const log = (...args) => console.log(...args);

const isSelector = startsWithAny('.', '#', '>');

const isAtRule = startsWith('@');

const isPseudoSelector = startsWith(':');

const isSelectorOrPseudo = anyPass([isSelector, isPseudoSelector]);

const isBrowserPrefixed = startsWith('-');

const createStyleRule = (key, value) => {
  const styleKey = key |> unless(isBrowserPrefixed, dasherize);
  const ruleValue = value |> when(isArray).onlyThen(join(', '));

  return `${styleKey}: ${ruleValue};`;
}

const createNestedSelector = (parent, child) => {
  const selectorPair = [parent, child];

  if (isPseudoSelector(child)) {
    return selectorPair.join('');
  }

  return selectorPair.join(' ');
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
) // Paused here to sleep.....

// const computedValue = matchingProps >> reduceWhile(
//   isUndefinedOrFalse,
//   (previous, propName) => matchers[propName] >> whenFunctionCallWith(props[propName]),
//   false
// ) >> falseToNull >> defaultTo(defaultValue);

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

const mergeWith = (first) => (last) => ({
  ...first,
  ...last
});

const addToSelector = curry((selectorName, original, givenRule) => ({
  ...original,
  [selectorName]: [
    ...original?.[selectorName],
    givenRule
  ]
}));

const combinators = (original, parentSelector, additionalCombinators) => {
  const mergeWithResult = mergeWith(original);
  const mergeWithParentSelector = addToSelector(parentSelector, original);

  return {
    addRuleBlock: curry((key, value) => mergeWithResult({
      [key]: value
    })),
    addStyle: curry((key, value) => mergeWithParentSelector(
      createStyleRule(key, value)
    )),
    withSelector: (trailingSelector) => combineStrings(parentSelector, trailingSelector),
    ...additionalCombinators
  }

}
const parsers = (ruleResponder) => (parentSelector, props, rules) => {
  const parseNested = (nestedRule) => console.log('parsing nested') || parsers(
    parentSelector,
    props,
    nestedRule |> whenFunctionCallWith(props)
  )(ruleResponder);

  if (isFunction(rules)) return parseNested(rules);

  return rules |> toPairs |> reduce((result, [key, value]) => {
    const isFunctionRule   = isFunction(value);
    const hasObjectLiteral = isObjectLiteral(value);
    const hasNestedRules   = hasObjectLiteral || isFunctionRule;
    const isAtRuleBlock    = isAtRule(key) && hasNestedRules;

    const isCombiningSelector = isSelectorOrPseudo(key) && hasNestedRules;

    const isInlinePattern = (
      hasObjectLiteral
      && !isAtRuleBlock
      && !isCombiningSelector
      && !isFunctionRule
    );

    const isPatternBlock = (
      key === '__match'
      && hasNestedRules
    );

    const matchedResponse = {
      atRule:           isAtRuleBlock,
      combinedSelector: isCombiningSelector,
      inlinePattern:    isInlinePattern,
      blockPattern:     isPatternBlock
    } |> findKeyForValue(true) |> fallbackTo('style');

    const responder = (
      combinators(result, parentSelector, { parseNested, props })
      |> ruleResponder[matchedResponse]
    );

    return responder(key, value);
  }, { [parentSelector]: [] });
}

const ignoreWhen = (ignorePredicate) => {
  const outputFn = (value) => {
    if (!ignorePredicate(value)) return value;
  }
  outputFn.otherwise = (transformPass) => (value) => {
    if (!ignorePredicate(value)) return transformPass(value);
  }

  return outputFn;
}

export const parseAllStyles = parsers({
  atRule: ({ addRuleBlock, addToParent, parseNested }) => (key, value) => (
    addRuleBlock(key, parseNested(value))
  ),
  combinedSelector: ({ addRuleBlock, withSelector, parseNested }) => (key, value) => (
    addRuleBlock(
      withSelector(key),
      parseNested(value)
    )
  ),
  inlinePattern: ({ addStyle, parseNested, props }) => (key, value) => {
    const { default: defaultValue, ...matchers } = value;
    const pickFromMatchers = matchers |> flip(pick);
    const intersectedMatchers = props |> keys |> pickFromMatchers;

    const computedStyle = intersectedMatchers |> iterateUntilResult(
      (key, value) => value |> whenFunctionCallWith(props[key])
    ) |> fallbackTo(defaultValue);

    return computedStyle |> ignoreWhen(isUndefinedOrFalse).otherwise(addStyle(key));
  },
  style: ({ addStyle }) => (key, value) => addStyle(key, value)
})

// TODO: This should be broken up
export const parseRules = (config) => {
  const logger = getLoggers(config);
  const actualParser = curry(
    (parentSelector, props, rules) => (
      Object.entries(rules).reduce((result, [key, value]) => {
        const isFunctionRule = isFunction(value);
        const hasObjectLiteral = isObjectLiteral(value);
        const hasNestedRules = hasObjectLiteral || isFunctionRule;

        const hasAtRuleBlock = isAtRule(key) && hasNestedRules;
        const shouldBeCombinedSelector = isSelectorOrPseudo(key) && hasNestedRules;
        const isPatternMatch = (
          hasObjectLiteral
          && !hasAtRuleBlock
          && !shouldBeCombinedSelector
          && !isFunctionRule
        );

        if (hasAtRuleBlock) {
          const additionalRules = actualParser(parentSelector, props, value);

          return {
            ...result,
            [key]: additionalRules
          }
        }

        if (shouldBeCombinedSelector) {
          const mergedSelector = createNestedSelector(parentSelector, key);
          const additionalRules = (
            value
            >> whenFunctionCallWith(props)
            >> actualParser(mergedSelector, props)
          );

          return {
            ...result,
            ...additionalRules
          }
        }
        // Rule-level stuff below

        const existingRules = result[parentSelector] || [];

        if (isPatternMatch) {
          const { default: defaultValue, ...matchers } = value;
          const allPropNames = Object.keys(props);
          const allMatchers = Object.keys(matchers);
          const matchingProps = intersection(allPropNames, allMatchers);

          const computedValue = matchingProps >> reduceWhile(
            isUndefinedOrFalse,
            (previous, propName) => matchers[propName] >> whenFunctionCallWith(props[propName]),
            false
          ) >> falseToNull >> defaultTo(defaultValue);

          // If the match ends up not giving a real value (and there is no default),
          // then we just skip this rule entirely.
          if (isUndefinedOrFalse(computedValue)) {
            logger.matchNotFound({ ruleName: key });
            return result;
          }

          return {
            ...result,
            [parentSelector]: [
              ...existingRules,
              createStyleRule(key, computedValue)
            ]
          };
        }

        return {
          ...result,
          [parentSelector]: [
            ...existingRules,
            createStyleRule(key, (value >> whenFunctionCallWith(props)))
          ]
        };
      }, { [parentSelector]: [] })
    )
  );

  return actualParser;
};

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

export const parseAndStringify = (config) => pipe(
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
