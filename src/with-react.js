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
  concat
} from 'ramda';

import {
  withContext,
  getContext,
  pure,
  setDisplayName,
  wrapDisplayName,
  setPropTypes
} from 'recompose';

import { css, generateClassName } from './style-parser';

import {
  safeJoinWith,
  shadesLog,
  proxyFunctionWithPropertyHandler,
  when,
  isString
} from './utilities';

const wrapReactName = curry(
  (wrapperName, Component) => wrapDisplayName(Component, wrapperName) |> setDisplayName
);

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

const applyShadeContext = (original) => original >> getContext({
  targetDom: PropTypes.object,
  showDebug: PropTypes.bool
}) >> pure;

const shadesElementClassName = '__shades-element';
const badConfigMsg    = 'Looks like either the Shades context provider is missing, or is incorrectly configured.';
const isShades        = prop('__isShadesElement');
const getShadesStyles = prop('__shadesStyles');

const prettyComponentFactory = curry(
  (tagName, styleRules) => {
    const componentOrTagName = tagName |> when(isString).otherwise(
      objectHash.MD5
    );

    const baseClassName     = componentOrTagName |> concat('shades-');
    const prettyDisplayName = componentOrTagName |> concat('shades.');
    const logger            = shadesLog(prettyDisplayName);

    const prettyElement = (
      ({ targetDom, showDebug, children, className, ...props }) => {
        if (!targetDom) {
          logger.error(badConfigMsg);
          throw new Error(
            badConfigMsg
          );
        }

        const computedStyleClassName = css(
          {
            className: baseClassName,
            target: targetDom,
            props,
            showDebug,
            displayName: prettyDisplayName
          },
          styleRules
        );

        const propsToForward = props >> pickBy((val, key) => shouldForwardProperty(tagName, key));

        return React.createElement(tagName, {
          className: joinWithSpace(shadesElementClassName, computedStyleClassName, className),
          ...propsToForward
        }, children);
      }
    )
    |> setDisplayName(prettyDisplayName)
    |> applyShadeContext
    |> proxyFunctionWithPropertyHandler({
      match: logger.deprecated('.match', (matcherRules) => prettyComponentFactory(tagName, {
        ...styleRules,
        '__match': matcherRules
      })),
      extend: (additionalRules) => prettyComponentFactory(tagName, {
        ...styleRules,
        ...(
          additionalRules |> when(isShades).then(getShadesStyles)
        )
      }),
      __isShadesElement: true,
      __shadesStyles: styleRules,
      __prettyName: prettyDisplayName
    });

    return prettyElement;
  }
)

const withComponent = curry(
  (styleRules, Component) => prettyComponentFactory(Component, styleRules)
);

const domHelpers = htmlTagNames.reduce((result, tag) => ({
  ...result,
  [tag]: prettyComponentFactory(tag)
}), { withComponent, Provider: Shades });

export default domHelpers;
