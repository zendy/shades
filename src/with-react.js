import React        from 'react';
import htmlTagNames from 'html-tag-names'
import PropTypes    from 'prop-types';
import shouldForwardProperty from './should-forward-prop';
import objectHash from 'object-hash';

import {
  curry,
  compose,
  pickBy,
  prop,
  either,
  concat,
  reduceRight,
  mergeDeepRight,
  map,
  reduce,
  toPairs,
  fromPairs,
  replace,
  slice,
  flip,
  startsWith
} from 'ramda';

import {
  withContext,
  getContext,
  pure,
  setDisplayName,
  wrapDisplayName,
  setPropTypes,
  setStatic
} from 'recompose';

import { css, generateClassName } from './style-parser';

import {
  safeJoinWith,
  shadesLog,
  withMethods,
  when,
  isString,
  not,
  firstItem
} from './utilities';

const joinWithSpace = safeJoinWith(' ');

/**
 * Shades context Provider
 * @type {React.Component}
 * @param {HTMLElement} to The node or target to render the stylesheet to
 *                        (You would typically pass the shadow dom reference)
 * @param {boolean} [showDebug=false] Whether to print debug messages to console
 * @example
 * <Shades to={document.querySelector('body')}>
 *   <shades.h1>Hello</shades.h1>
 * </Shades>
 */
export const Shades = compose(
  setDisplayName('Shades.Provider'),
  setPropTypes({
    to: PropTypes.object.isRequired,
    showDebug: PropTypes.bool,
    prefixer: PropTypes.oneOfType([PropTypes.bool, PropTypes.object])
  }),
  withContext(
    {
      targetDom: PropTypes.object,
      showDebug: PropTypes.bool,
      prefixer: PropTypes.oneOfType([PropTypes.bool, PropTypes.object])
    },
    ({ to, showDebug, prefixer }) => ({ targetDom: to, showDebug, prefixer })
  )
)(props => props.children);

const applyShadesContext = setStatic('contextTypes', {
  targetDom: PropTypes.object,
  showDebug: PropTypes.bool,
  prefixer: PropTypes.oneOfType([PropTypes.bool, PropTypes.object])
})

const badConfigMsg    = 'Looks like either the Shades context provider is missing, or is incorrectly configured.';
const isShades        = prop('__isShadesElement');
const getShadesStyles = prop('__styleRules');

const shadesGeneralLogger = shadesLog('Shades.Provider');

const extendableStyleFactory = (metaData, extendableThing) => (styleRules = {}) => (
  extendableThing(styleRules) |> withMethods((originalComponent) => ({
    __isShadesElement: true,
    __shadesMetadata: metaData,
    __styleRules: styleRules,
    extend: (...moreStyles) => {
      const normalisedStyles = moreStyles |> map(when(isShades).then(getShadesStyles));

      return extendableStyleFactory(metaData, extendableThing)(
        normalisedStyles |> reduce(mergeDeepRight, styleRules)
      );
    },
    match: shadesGeneralLogger.deprecated('.match')((matcherRules) => extendableStyleFactory(metaData, extendableThing)({
      ...styleRules,
      '__match': matcherRules
    })),
  }))
)

const mapKeys = (mapper) => compose(
  fromPairs,
  map(([key, value]) => [mapper(key), value]),
  toPairs
)

const sliceFrom = flip(slice)(Infinity);

const htmlPrefix = 'html-';

const removeHtmlPrefixes = mapKeys(
  when(startsWith(htmlPrefix)).then(sliceFrom(htmlPrefix.length))
)

const shadesElement = (innerElement, { displayName, baseClass }) => (styleRules) => (
  applyShadesContext(
    ({ children, className, ...props }, { targetDom, showDebug, prefixer }) => {
      if (!targetDom) throw new Error(badConfigMsg);

      const computedClassname = css({
        className:   baseClass,
        target:      targetDom,
        showDebug,
        prefixer,
        props
      }, styleRules);

      // TODO: combine these operations for improved performance
      const propsToForward = props |> when(isString(innerElement)).then(
        pickBy((val, key) => shouldForwardProperty(innerElement, key)),
        removeHtmlPrefixes
      );

      return React.createElement(innerElement, {
        ...propsToForward,
        className: joinWithSpace(computedClassname, className),
      }, children);
    }
  ) |> setDisplayName(displayName)
);

const makeShadesDisplayName = (tagName) => `shades.${tagName}`;
const makeShadesBaseClass = (tagName) => `shades-${tagName}`;

const genericStyles = extendableStyleFactory({
  isGeneric: true
}, (styleRules) => (WrappedComponent) => styleRules |> shadesElement(WrappedComponent, {
  displayName: makeShadesDisplayName('generic'),
  baseClass: makeShadesBaseClass('generic')
}))

const withComponent = genericStyles |> shadesLog().deprecatedAlternative('.withComponent', '.generic');

const domHelpers = htmlTagNames.reduce((result, tag) => ({
  ...result,
  [tag]: (
    extendableStyleFactory({
      isGeneric: false
    }, shadesElement(tag, {
      displayName: makeShadesDisplayName(tag),
      baseClass: makeShadesBaseClass(tag)
    }))
  )
}), { withComponent, generic: genericStyles, Provider: Shades });

export default domHelpers;
