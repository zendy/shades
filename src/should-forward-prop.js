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

const isNotHtmlTag = (value) => !isString(value);
const isReactProp  = (propName) => reactProps.includes(propName);
const isDataOrAria = startsWithAny('data-', 'aria-');
const isHtmlEscapeHatch = startsWithAny('html-');

// Determines whether a property can be passed directly to
// a target node - if the node is a standard HTML tag, the
// property name is checked against a list of known acceptable
// attributes for that tag, and only if a match is found
// does it get passed through to the underlying node.
// If its a React component, then it passes everything through.
const shouldForwardProperty = (tagName, propName) => (
  // Should only ever need to do this filtering when the
  // receiver is a standard HTML tag name (which will be a string here)
  // If `tagName` is anything other than a string, its not an HTML tag
  isNotHtmlTag(tagName)
  // React props are also passed straight through for HTML tags
  || isReactProp(propName)
  // Same with attributes that start with "html"
  || isHtmlEscapeHatch(propName)
  // Same with data and aria attributes
  || isDataOrAria(propName)
  || isHtmlProp(tagName, propName)
);

export default memoize(shouldForwardProperty);
