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
  reduceRight
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
  proxyFunctionWithPropertyHandler,
  withMethods,
  when,
  isString,
  not
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
    showDebug: PropTypes.bool
  }),
  withContext(
    { targetDom: PropTypes.object, showDebug: PropTypes.bool },
    props => ({ targetDom: props.to, showDebug: props.showDebug })
  )
)(props => props.children);

const applyShadeContext = setStatic('contextTypes', {
  targetDom: PropTypes.object,
  showDebug: PropTypes.bool
})

const badConfigMsg    = 'Looks like either the Shades context provider is missing, or is incorrectly configured.';
const isShades        = prop('__isShadesElement');
const getShadesStyles = prop('__shadesStyles');

const prettyComponentFactory = curry(
  (tagName, styleRules) => {
    const isGeneric = tagName |> not(isString);
    const componentOrTagName = tagName |> when(isString).otherwise('generic');

    const baseClassName     = componentOrTagName |> concat('shades-');
    const prettyDisplayName = componentOrTagName |> concat('shades.');
    const logger            = shadesLog(prettyDisplayName);

    const prettyElement = (
      ({ children, className, ...props }, { targetDom, showDebug }) => {
        if (!targetDom) {
          throw logger.error(badConfigMsg);
        }

        const computedStyleClassName = css(
          {
            displayName: prettyDisplayName,
            className:   baseClassName,
            target:      targetDom,
            showDebug,
            props
          },
          styleRules
        );

        const propsToForward = props |> pickBy((val, key) => shouldForwardProperty(tagName, key));

        return React.createElement(tagName, {
          ...propsToForward,
          className: joinWithSpace(computedStyleClassName, className),
        }, children);
      }
    )
    |> applyShadeContext
    |> setDisplayName(prettyDisplayName)
    |> withMethods((originalComponent) => ({
        __isShadesElement: true,
        __shadesStyles: styleRules,
        __prettyName: prettyDisplayName,
        __isGeneric: isGeneric,
        __tagName: componentOrTagName,

        match: (matcherRules) => prettyComponentFactory(tagName, {
          ...styleRules,
          '__match': matcherRules
        }) |> logger.deprecated('.match'),

        extend: (...genericComponents) => (
          compose(...genericComponents)(originalComponent)
        )
      }));

    return prettyElement;
  }
)

const genericStyles = curry(
  (styleRules, Component) => prettyComponentFactory(Component, styleRules)
);

const domHelpers = htmlTagNames.reduce((result, tag) => ({
  ...result,
  [tag]: prettyComponentFactory(tag)
}), { withComponent: genericStyles |> shadesLog().deprecatedAlternative('.withComponent', '.generic'), generic: genericStyles, Provider: Shades });

export default domHelpers;
