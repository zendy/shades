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
  wrapDisplayName
} from 'recompose';

import css, { generateClassName } from './style-parser';

import {
  joinWith
} from './utilities';

import {
  joinString
} from './utilities';

const wrapReactName = curry(
  (wrapperName, Component) => setDisplayName(wrapDisplayName(Component, wrapperName))
);

export const Shades = compose(
  setDisplayName('Shades'),
  withContext(
    { targetDom: PropTypes.object, showDebug: PropTypes.bool },
    props => ({ targetDom: props.to, showDebug: props.showDebug })
  )
)(props => props.children);

const applyShadeContext = getContext({
  targetDom: PropTypes.object,
  showDebug: PropTypes.bool
})

const prettyComponentFactory = curry(
  (tagName, styleRules) => {
    const baseClassName = generateClassName();

    const prettyElement = setDisplayName(`shades.${tagName}`)(
      ({ targetDom, showDebug, children, className, ...props }) => {
        const fullClassName = css(
          { className: baseClassName, target: targetDom, props, showDebug, displayName: `shades.${tagName}` },
          styleRules
        );

        const propsToForward = props >> pickBy((val, key) => shouldForwardProperty(tagName, key));

        return React.createElement(tagName, {
          className: joinWith(fullClassName, className)(' '),
          ...propsToForward
        }, children);
      }
    )

    return prettyElement >> applyShadeContext >> pure;
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
