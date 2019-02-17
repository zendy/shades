import React        from 'react';
import htmlTagNames from 'html-tag-names'
import PropTypes    from 'prop-types';
import hasher from 'hash-it';
import shouldForwardProperty from './should-forward-prop';

import {
  curry,
  compose,
  pipe,
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

const isShades        = prop('__isShadesElement');
const getShadesStyles = prop('__styleRules');
const badConfigMsg    = 'Looks like either the Shades context provider is missing, or is incorrectly configured.';
const htmlPrefix      = 'html-';

const joinWithSpace = safeJoinWith(' ');

const mapKeys = (mapper) => compose(
  fromPairs,
  map(([key, value]) => [mapper(key), value]),
  toPairs
)
const sliceFrom = flip(slice)(Infinity);
const removeHtmlPrefixes = mapKeys(
  when(startsWith(htmlPrefix)).then(sliceFrom(htmlPrefix.length))
);

// TODO: combine these operations for improved performance
const processAndForwardDomAttributes = (elementName) => (
  pipe(
    pickBy((val, key) => shouldForwardProperty(elementName, key)),
    removeHtmlPrefixes
  )
)

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

const extendableStyleFactory = (name, extendableThing) => (styleRules = {}) => {
  const classIdentityHash = hasher([name, styleRules]);
  const classIdentity     = `shades-element-${classIdentityHash}`;
  const classPrefix       = `shades-${name}`;
  const displayName       = `shades.${name}`;

  return (
    extendableThing(name, {
      displayName,
      classPrefix,
      classIdentity,
      styleRules
    }) |> withMethods((originalComponent) => ({
      __isShadesElement: true,
      __styleRules: styleRules,
      __classIdentity: classIdentity,
      extend: (...moreStyles) => {
        const normalisedStyles = moreStyles |> map(when(isShades).then(getShadesStyles));

        return extendableStyleFactory(name, extendableThing)(
          normalisedStyles |> reduce(mergeDeepRight, styleRules)
        );
      }
    }))
  )
}

const shadesElement = (innerElement, { displayName, classPrefix, classIdentity, styleRules }) => (
  applyShadesContext(
    ({ children, className, ...props }, { targetDom, showDebug, prefixer }) => {
      if (!targetDom) throw new Error(badConfigMsg);

      const computedClassname = css({
        className:   classPrefix,
        target:      targetDom,
        showDebug,
        prefixer,
        props
      }, styleRules);

      const propsToForward = props |> when(isString(innerElement)).then(
        processAndForwardDomAttributes(innerElement)
      );

      return React.createElement(innerElement, {
        ...propsToForward,
        className: joinWithSpace(computedClassname, classIdentity, className),
      }, children);
    }
  ) |> setDisplayName(displayName)
);

const genericElement = extendableStyleFactory(
  'generic',
  (name, metaData) => (WrappedComponent) => shadesElement(WrappedComponent, metaData)
)

const withComponent = genericElement |> shadesLog().deprecatedAlternative('.withComponent', '.generic');

const domHelpers = htmlTagNames.reduce((result, tag) => ({
  ...result,
  [tag]: (
    extendableStyleFactory(tag,shadesElement)
  )
}), { withComponent, generic: genericElement, Provider: Shades });

export default domHelpers;
