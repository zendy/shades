import {
  compose,
  map,
  concat,
  join,
  curry,
  prop,
  propEq,
  equals,
  mapObjIndexed,
  apply
} from 'ramda';

import {
  dasherize,
  isString,
  isSymbol,
  isNumber,
  isArray,
  isDefined,
  when,
  betterSet,
  includes,
  proxyPropertyGetter,
  anyOf,
  allOf,
  firstItem,
  lastItem
} from '../utilities';

// const fontFaceStore = stateful({
//   index: 1,
//   cached: new Map()
// }, {
//   addToCache: ({ cached, index }, hashKey, parsedValue) => ({
//     cached: cached.set(hashKey, parsedValue),
//     index: index + 1
//   })
// });

const fontFacePlainKeys = ['src', 'unicodeRange'];
const isTuple           = allOf(isArray, propEq('length', 2));
const isLocal           = allOf(isTuple, compose(equals('local'), firstItem));
const asLocal           = (value) => `local(${value |> JSON.stringify})`;
const asFormat          = (value) => `format(${value |> JSON.stringify})`;
const asUrl             = (value) => `url(${value |> JSON.stringify})`;

const asUrlWithFormat = (format, url) => (
  [
    url    |> asUrl,
    format |> asFormat
  ] |> join(' ')
);

export const parseSrc = (items) => when(isString).otherwise(
  map(
    when(isTuple).then(
      when(isLocal)
        .then(lastItem, asLocal)
        .otherwise(apply(asUrlWithFormat))
    )
  )
);



//
// const createFontFace = (fontName, fontItem) => {
//   return mapObjIndexed((value, key) => {
//     const newKey = key |> when(includedIn(fontFacePlainKeys)).otherwise(dasherize, concat('font-'));
//
//
//   })
// }
//
// const fontFaceHandler = (...givenItems) => {
//   const fromCache    = fontFaceStore.getState('cached');
//   const currentIndex = fontFaceStore.getState('index');
//
//   return givenItems |> when(fromCache.has).then(fromCache.get).otherwise(
//     (argumentValues) => {
//       const familyName = (
//         argumentValues
//         |> firstItem
//         |> when(isString).otherwise(
//           concat('shades-fontface-', currentIndex)
//         )
//       );
//
//       const
//     }
//   )
// }
