import htmlAttributes from 'react-html-attributes';
import memoize from 'fast-memoize';
import reactProps from './react-props';

import {
  isString,
  startsWithAny
} from './utilities';

const globalHtmlProps = htmlAttributes['*'];

const isHtmlProp = (tagName, propName) => (
  globalHtmlProps.includes(propName)
  || htmlAttributes?.[tagName]?.includes(propName)
);

const isReactProp = (propName) => reactProps.includes(propName);

const isDataOrAria = startsWithAny('data-', 'aria-');

const shouldForwardProperty = (tagName, propName) => (
  !isString(tagName)
  || isReactProp(propName)
  || isHtmlProp(tagName, propName)
  || isDataOrAria(propName)
);

export default memoize(shouldForwardProperty);
