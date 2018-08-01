import {
  Maybe,
  safe,
  identity
} from 'crocks';

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
const styleCacheKey = Symbol.for('Shades: Style Cache');
const stylesheetAttribute = 'data-shades';

const maybeDefined = safe(isDefined);

const orMaybe = (nothingFn) => (maybeValue) => (
  maybeValue.coalesce(nothingFn, identity)
);

const orElse = (nothingFn) => (maybeValue) => (
  maybeValue.either(nothingFn, identity)
)

const andReturn = (valueToReturn) => () => valueToReturn;

const addToMap = (dataStore) => curry((key, value) => dataStore.set(key, value) && value);

const createElement = (tagName) => {
  const newElement = document.createElement(tagName);

  const output = newElement |> withMethods({
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

export const styleCache = globalScope.getOrCreate(styleCacheKey, () => {
  const dataStore = new Map();

  return dataStore |> withMethods({
    add: (selector, generateStyle) => (
      maybeDefined(dataStore.get(selector))
      |> orElse(compose(
        selector |> addToMap(dataStore),
        generateStyle
      ))
      |> pair(selector)
    )
  });
})

const fastInsertRule = curry(
  (target, rule) => {
    const index = target?.cssRules?.length ?? 1;
    return target?.insertRule(rule, index) ?? target?.addRule(rule);
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

const createStylesheetFor = (target) => {
  const dataStore = new Map();

  const styleSheetElement = (
    target.querySelector(`style[${stylesheetAttribute}]`) ||
    createElement('style')
      .withEmptyAttribute(stylesheetAttribute)
      .appendTo(target)
      .unwrap()
  );

  return dataStore |> withMethods({
    insertStyles: ([selector, stylesToInsert]) => {
      const hasAlreadyInserted = dataStore.has(selector);

      if (!hasAlreadyInserted) {
        stylesToInsert |> forEach(appendRule(styleSheetElement));
        dataStore.set(selector, true);
      }

      return selector;
    }
  })
}

export const stylesheetRegistry = globalScope.getOrCreate(stylesheetRegistryKey, () => {
  const dataStore = new Map();

  const createAndAddStylesheet = (target) => {
    const stylesheetForTarget = target |> createStylesheetFor;
    dataStore.set(target, stylesheetForTarget);
    return stylesheetForTarget;
  }

  return dataStore |> withMethods({
    getSheetFor: (target) => (
      dataStore.get(target) || createAndAddStylesheet(target)
    )
  })
})
