import React        from 'react';
import htmlTagNames from 'html-tag-names'
import PropTypes    from 'prop-types';

import {
  curry,
  compose
} from 'ramda';

import {
  withContext,
  getContext,
  pure,
  setDisplayName,
  wrapDisplayName
} from 'recompose';

import css, { generateClassName } from './style-parser';

const wrapReactName = curry(
  (wrapperName, Component) => setDisplayName(wrapDisplayName(Component, wrapperName))
)

export const Shades = compose(
  setDisplayName('Shades'),
  withContext(
    { targetDom: PropTypes.object },
    props => ({ targetDom: props.to })
  )
)(props => props.children);

const getShadeTarget = getContext({
  targetDom: PropTypes.object
})

const prettyComponentFactory = curry(
  (tagName, styleRules) => {
    const baseClassName = generateClassName();

    const prettyElement = setDisplayName(`shades.${tagName}`)(
      ({ targetDom, children, ...props }) => {
        const fullClassName = css(baseClassName, styleRules, targetDom, props);

        return React.createElement(tagName, {
          className: fullClassName,
          ...props
        }, children);
      }
    )

    return prettyElement >> getShadeTarget >> pure;
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
