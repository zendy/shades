import htmlAttributes from 'react-html-attributes';
import memoize from 'fast-memoize';
import reactProps from './react-props';

import {
  isString
} from './utilities';

const globalHtmlProps = htmlAttributes['*'];

const isHtmlProp = (tagName, propName) => (
  globalHtmlProps.includes(propName)
  || htmlAttributes?.[tagName]?.includes(propName)
);

const isReactProp = (propName) => reactProps.includes(propName);

const shouldForwardProperty = (tagName, propName) => (
  !isString(tagName)
  || isReactProp(propName)
  || isHtmlProp(tagName, propName)
);

export default memoize(shouldForwardProperty);
