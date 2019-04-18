import {
  compose,
  curry,
  pair,
  toPairs,
  forEach,
  prop
} from 'ramda';

import {
  when,
  withMethods,
  isDefined
} from '../utilities';

import globalScope from './global-scope';

const stylesheetRegistryKey = Symbol.for('Shades: Stylesheet Registry');
const styleCacheKey         = Symbol.for('Shades: Style Cache');
const stylesheetAttribute   = 'data-shades';

const andReturn = (valueToReturn) => () => valueToReturn;
const addToMap = (dataStore) => curry((key, value) => dataStore.set(key, value) && value);

const createElement = (tagName) => {
  const newElement = document.createElement(tagName);

  const output = ({
    appendTo: (target) => target.appendChild(newElement) |> andReturn(output),
    withChildren: (items) => items.forEach((child) => newElement.appendChild(child)) |> andReturn(output),
    withAttribute: (name, value = true) => newElement.setAttribute(name, value) |> andReturn(output),
    withAttributes: (items) => (
      items
      |> toPairs
      |> forEach(([name, value]) => newElement.setAttribute(name, value))
      |> andReturn(output)
    ),
    withEmptyAttribute: (name) => newElement.setAttribute(name, '') |> andReturn(output),
    unwrap: () => newElement
  });

  return output;
}

const fastInsertRule = curry(
  (target, rule) => {
    const index = target?.cssRules?.length ?? 1;

    try {
      return target?.insertRule(rule, index) ?? target?.addRule(rule);
    } catch (error) {
      return slowInsertRule(target, rule);
    }
  }
);

const slowInsertRule = curry(
  (target, rule) => target.appendChild(document.createTextNode(rule))
);

const appendRule = (
  when(!process?.env?.isDevelopment)
    .then(prop('sheet'), fastInsertRule)
    .otherwise(slowInsertRule)
);

const appendRuleDebug = slowInsertRule;

const createStylesheetFor = (config) => (target) => {
  const dataStore = new Map();

  const styleSheetElement = (
    target.querySelector(`style[${stylesheetAttribute}]`) ||
    createElement('style')
      .withEmptyAttribute(stylesheetAttribute)
      .appendTo(target)
      .unwrap()
  );

  return ({
    insertStyles: ([selector, stylesToInsert]) => {
      const hasAlreadyInserted = dataStore.has(selector);

      if (!hasAlreadyInserted) {
        stylesToInsert |> when(config?.debug).then(
          forEach(appendRuleDebug(styleSheetElement))
        ).otherwise(
          forEach(appendRule(styleSheetElement))
        );

        dataStore.set(selector, true);
      }

      return selector;
    },

  })
}

export const styleCache = globalScope.getOrCreate(styleCacheKey, () => {
  const dataStore = new Map();

  return ({
    add: (selector, generateStyle) => (
      dataStore.get(selector)
      |> when(isDefined).otherwise(compose(
        selector |> addToMap(dataStore),
        generateStyle
      ))
      |> pair(selector)
    )
  });
})

export const stylesheetRegistry = (config) => globalScope.getOrCreate(stylesheetRegistryKey, () => {
  const dataStore = new Map();

  const createAndAddStylesheet = (target) => {
    const stylesheetForTarget = target |> createStylesheetFor(config);
    dataStore.set(target, stylesheetForTarget);
    return stylesheetForTarget;
  }

  return ({
    getSheetFor: (target) => (
      dataStore.get(target) || createAndAddStylesheet(target)
    )
  })
})
