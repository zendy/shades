import React        from 'react';
import htmlTagNames from 'html-tag-names'
import PropTypes    from 'prop-types';
import shouldForwardProperty from './should-forward-prop';

import {
  curry,
  compose,
  pickBy
} from 'ramda';

import {
  withContext,
  getContext,
  pure,
  setDisplayName,
  wrapDisplayName,
  setPropTypes
} from 'recompose';

import css, { generateClassName } from './style-parser';

import {
  joinWith,
  getLoggers
} from './utilities';

const wrapReactName = curry(
  (wrapperName, Component) => setDisplayName(wrapDisplayName(Component, wrapperName))
);

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
  setDisplayName('Shades'),
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

const prettyComponentFactory = curry(
  (tagName, styleRules) => {
    const baseClassName = generateClassName();
    const prettyDisplayName = `shades.${tagName}`;
    const prettyElement = applyShadeContext << setDisplayName(prettyDisplayName) << (
      ({ targetDom, showDebug, children, className, ...props }) => {
        const logger = getLoggers({ showDebug, displayName: prettyDisplayName });

        if (!targetDom) {
          const badConfigMsg = 'Looks like either the Shades context provider is missing, or is incorrectly configured.';
          logger.error(badConfigMsg);
          throw new Error(
            badConfigMsg
          );
        }

        const fullClassName = css(
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
          className: joinWith(fullClassName, className)(' '),
          ...propsToForward
        }, children);
      }
    )

    prettyElement.match = (matcherRules) => prettyComponentFactory(tagName, {
      ...styleRules,
      '__match': matcherRules
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
}), { withComponent });

export default domHelpers;
