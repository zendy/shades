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
  isUndefinedOrFalse
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
  reduceWhile
} from 'ramda';

const asPseudoSelector = (key) => `:${dasherize(key)}`;
const asPseudoElement = (key) => `::${dasherize(key)}`;

const log = (...args) => console.log(...args);
const startsWithAny = (...searchStrs) => searchStrs >> map(startsWith) >> anyPass

const isSelector = startsWithAny('.', '#', '>');

const isAtRule = startsWith('@');

const isPseudoSelector = startsWith(':');

const isSelectorOrPseudo = anyPass([isSelector, isPseudoSelector]);

const createStyleRule = (key, value) => {
  const styleKey = dasherize(key);
  const ruleValue = value >> when(isArray).onlyThen(join(', '));

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

export const parseRules = curry(
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
        const additionalRules = parseRules(parentSelector, props, value);

        return {
          ...result,
          [key]: additionalRules
        }
      }

      if (shouldBeCombinedSelector) {
        const mergedSelector = createNestedSelector(parentSelector, key);
        const additionalRules = (
          value
          >> when(isFunction).onlyThen(fn => fn(props))
          >> parseRules(mergedSelector, props)
        );

        return {
          ...result,
          ...additionalRules
        }
      }

      // Rule-level stuff below

      const existingRules = result[parentSelector] || [];

      const falseToNull = (value) => {
        if (value === false) return null;
        return value;
      }

      if (isPatternMatch) {
        console.log('pattern match')
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
        if (isUndefinedOrFalse(computedValue)) return result;

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
    return target.insertRule(rule, index);
  }
);

export const compileToCss = pipe(parseRules, stringifyRules);

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

const css = (className, styleRules, target, props = {}) => {
  const theSheet = getSheetFor(target);
  const generatedSelector = classNameWithProps(className, props);
  const generatedClassName = generatedSelector >> asClassName;

  const alreadyCached = shadeStore.getState('cached').has(generatedClassName);

  if (alreadyCached) return generatedSelector;

  shadeStore.lift(({ addToCache }) => addToCache(generatedClassName));

  const styleString = compileToCss(generatedClassName, props, styleRules).forEach(
    appendRule(theSheet)
  );

  return generatedSelector;
}

export default css;
