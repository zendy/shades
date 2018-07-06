export const PSEUDO_SELECTORS = {
  ELEMENTS: [
    'before',
    'after',
    'backdrop',
    'cue',
    'firstLetter',
    'firstLine',
    'grammarError',
    'placeholder',
    'selection',
    'spellingError'
  ],
  FUNCTIONS: [
    'any',
    'dir',
    'lang',
    'matches',
    'not',
    'nthChild',
    'nthLastChild',
    'nthLastOfType',
    'nthOfType'
  ],
  CLASSES: [
    'active',
    'anyLink',
    'checked',
    'default',
    'defined',
    'disabled',
    'empty',
    'enabled',
    'first',
    'firstChild',
    'firstOfType',
    'fullscreen',
    'focus',
    'focusWithin',
    'hover',
    'indeterminate',
    'inRange',
    'invalid',
    'lastChild',
    'lastOfType',
    'left',
    'link',
    'onlyChild',
    'onlyOfType',
    'optional',
    'outOfRange',
    'placeholderShown',
    'readOnly',
    'readWrite',
    'required',
    'right',
    'root',
    'scope',
    'target',
    'valid',
    'visited'
  ]
};

export const COMBINATORS = {
  COMBINATOR_AND: 'combinator.and',
  COMBINATOR_OR:  'combinator.or',
  PROPERTY_AND:   'property.and',
  PROPERTY_OR:    'property.or'
};

export const COMBINATOR_INSERTS = {
  [COMBINATORS.COMBINATOR_AND]: '&&',
  [COMBINATORS.PROPERTY_AND]:   '&&',
  [COMBINATORS.COMBINATOR_OR]:  '||',
  [COMBINATORS.PROPERTY_OR]:    '||'
};
