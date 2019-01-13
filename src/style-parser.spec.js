import {
  css,
  parseAllStyles,
  stringifyRules,
  generateVendorPrefixes
} from './style-parser';

import {
  states,
  mq
} from './helpers';

import {
  map
} from 'ramda';

import style from './helpers/style';

const parseRulesNoDebug = (selector, props, rules) => parseAllStyles({
  parentSelector: [selector],
  props
})(rules).toJS();

const parseAndStringify = (selector, props, rules) => (
  parseAllStyles({
    parentSelector: [selector],
    props
  })(rules) |> stringifyRules
);

const topSelector = '#meow';

describe('parseRules', () => {
  it('takes an object of rules and gives me back some more rules as strings', () => {
    const result = parseRulesNoDebug(topSelector, {}, {
      fontSize: '10px',
      color: 'blue',
      fontWeight: 'normal'
    });

    expect(result).toHaveProperty([topSelector]);
  })
  it('combines nested pseudo-elements and pseudo-selectors with the main selector', () => {
    const topSelectorHover = `${topSelector}:hover`;
    const topSelectorBefore = `${topSelector}::before`;

    const result = parseRulesNoDebug(topSelector, {}, {
      fontSize: '10px',
      color: 'blue',
      ':hover': {
        color: 'red'
      },
      '::before': {
        content: 'hi there',
        border: '1px solid #000'
      },
      fontWeight: 'normal'
    });

    expect(result).toHaveProperty([topSelector]);
    expect(result).toHaveProperty([topSelectorHover]);
    expect(result).toHaveProperty([topSelectorBefore]);

    expect(result[topSelector]).toMatchObject({
      'font-size': '10px',
      'color': 'blue',
      'font-weight': 'normal'
    });
    expect(result[topSelectorHover]).toMatchObject({
      'color': 'red'
    });
    expect(result[topSelectorBefore]).toMatchObject({
      'content': '"hi there"',
      'border': '1px solid #000'
    });
  })

  it('supports the style combinators', () => {
    const topSelectorHoverFocus = `${topSelector}:hover,${topSelector}:focus`;

    const result = parseRulesNoDebug(topSelector, {}, {
      fontSize: '10px',
      color: 'blue',
      [style.or(style.hover, style.focus)]: {
        color: 'purple',
        border: '1px solid #fff'
      }
    });

    expect(result).toHaveProperty([topSelectorHoverFocus]);

    const expectedStyles = {
      'color': 'purple',
      'border': '1px solid #fff'
    };

    expect(result[topSelectorHoverFocus]).toMatchObject(
      expectedStyles
    );
  })

  // TODO: stop using this as my "test-everything-ever" bucket
  it('should shift at-rules up to the top level', () => {
    const topSelectorHover = `${topSelector}:hover`;
    const mq = '@media screen and (max-width: 800px)';

    const result = parseRulesNoDebug(topSelector, { }, {
      fontSize: '10px',
      color: 'blue',
      [mq]: {
        fontSize: '90px',
        background: 'green',
        ':hover': {
          border: '1px solid red',
          fontWeight: 800
        }
      },
      textShadow: ['1px 1px 1px black', '2px 3px 4px white'],
      bubbles: ({dots}) => `1px ${dots ? 'dotted' : 'solid'} black`,
      ':hover': ({ cheese }) => ({
        fontFamily: cheese ? 'CheeseyMono' : 'MilkMono',
        border: `${cheese || 'none'} 100px`
      })
    });

    expect(result).toHaveProperty([topSelector]);
    expect(result).toHaveProperty([mq, topSelector]);
    expect(result).toHaveProperty([mq, topSelectorHover]);

    expect(result[topSelector]).toMatchObject({
      'font-size': '10px',
      'color': 'blue',
      'bubbles': '1px solid black'
    });

    expect(result[mq][topSelector]).toMatchObject({
      'font-size': '90px',
      'background': 'green'
    });
    expect(result[mq][topSelectorHover]).toMatchObject({
      'font-weight': '800',
      'border': '1px solid red'
    });
  });

  it('supports using functions as rules that take all given props as its argument', () => {
    const result = parseRulesNoDebug(
      topSelector,
      { dark: true, darkColor: 'navy' },
      {
        fontWeight: 'normal',
        color: (allProps) => allProps.darkColor ?? 'fallback'
      }
    );

    expect(result[topSelector]).toMatchObject({
      'font-weight': 'normal',
      'color': 'navy'
    })
  });

  it('really seriously supports all possible permutations of functions as style rule values', () => {
    const resultSimple = parseRulesNoDebug(
      topSelector,
      { dark: 'blue' },
      {
        [mq().portrait().from(370)]: (allProps) => ({
          [style.prop.dark]: value => ({
            color: ({ dark }) => value === dark && allProps.dark === value && 'navy'
          })
        })
      }
    );

    expect(resultSimple[mq().portrait().from(370)][topSelector]).toMatchObject({
      'color': 'navy'
    });
  });

  describe('Pattern matching', () => {
    it('supports pattern-matching rules for props', () => {
      const result = parseRulesNoDebug(topSelector, { dark: true }, {
        fontSize: '10px',
        color: 'green',
        [style.prop.dark]: {
          color: 'navy'
        },
        fontWeight: 'normal'
      });

      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toMatchObject({
        'color': 'navy'
      })
    })

    it('supports a default value when no pattern match found', () => {
      const result = parseRulesNoDebug(topSelector, { }, {
        fontSize: '10px',
        color: 'green',
        [style.prop.dark]: {
          color: 'navy'
        },
        fontWeight: 'normal'
      });

      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toMatchObject({
        'color': 'green'
      })
    })

    it('supports a pattern match rule as a function that takes the value of the named prop', () => {
      const result = parseRulesNoDebug(topSelector, { mode: 'dark' }, {
        fontSize: '10px',
        color: 'blue',
        [style.prop.mode]: value => ({
          color: `green-${value}`,
        }),
        fontWeight: 'normal'
      });


      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toMatchObject({
        'font-size': '10px',
        'color': 'green-dark',
        'font-weight': 'normal'
      });
    })

    it('uses the default value if the matched function returns null, undefined, or false', () => {
      const result = parseRulesNoDebug(topSelector, { mode: 'supersayan' }, {
        fontSize: '10px',
        color: 'green',
        zIndex: 5,
        fontWeight: 'normal',
        [style.prop.mode]: (value) => ({
          color: value === 'dark' && 'navy',
          fontSize: null,
          fontWeight: undefined,
          padding: '100px',
          zIndex: 0
        })
      });

      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toMatchObject({
        'font-size': '10px',
        'color': 'green',
        'padding': '100px',
        'font-weight': 'normal',
        'z-index': '0'
      });
    })

    it('skips the rule entirely if there is no match', () => {
      const result = parseRulesNoDebug(topSelector, { mode: 'something unknown', nextOne: 'hello' }, {
        fontSize: '10px',
        [style.prop.mode]: (value) => ({
          color: value === 'dark' && 'navy'
        }),
        [style.prop.kittensEverywhere]: {
          color: 'purple'
        },
        fontWeight: 'normal'
      });

      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).not.toHaveProperty(['color']);
    })

    it('skips the rule entirely if the props value is false, undefined or null', () => {
      const result = parseRulesNoDebug(topSelector, { kittensEverywhere: false }, {
        fontSize: '10px',
        [style.prop.kittensEverywhere]: {
          color: 'purple'
        }
      });

      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).not.toHaveProperty(['color']);
    })

    it('will render a block of styles for a block pattern', () => {
      const result = parseRulesNoDebug(
        topSelector,
        { mode: 'hi there', nextOne: 'dodgerblue' },
        {
          [style.prop.mode]: {
            fontWeight: 'bold',
            color: 'purple'
          },
          [style.prop.nextOne]: (value) => ({
            color: value,
            border: '1px solid #ccc'
          })
        }
      );

      expect(result[topSelector]).toMatchObject({
        'font-weight': 'bold',
        'color': 'dodgerblue',
        'border': '1px solid #ccc'
      });
    });

    it('will correctly parse the style.props combinators', () => {
      const result = parseRulesNoDebug(
        topSelector,
        { mode: 'hi there', nextOne: 'dodgerblue' },
        {
          background: 'orange',
          [style.props.all(style.prop.mode, style.prop.nextOne)]: {
            fontWeight: 'bold',
            color: 'purple'
          },
          [style.props.all(style.prop.imaginaryThing, style.prop.mode)]: {
            fontWeight: 'extra-light',
            color: 'green'
          },
          [style.props.any(style.prop.imaginaryThing, style.prop.mode)]: {
            thisIsADrill: 'everyone-just-chill'
          },
          [style.props.any(style.prop.imaginaryThing, style.prop.cannotConfirmNorDeny)]: {
            thisIsNotADrill: 'everyone-just-freak-out'
          },
          [style.prop.nextOne]: (value) => ({
            border: `1px solid ${value}`
          })
        }
      );

      expect(result[topSelector]).toMatchObject({
        'background':      'orange',
        'font-weight':     'bold',
        'color':           'purple',
        'border':          '1px solid dodgerblue',
        'this-is-a-drill': 'everyone-just-chill'
      });
    });


    it('renders style.element helpers as pseudo-elements', () => {
      const topSelectorBefore = `${topSelector}::before`;
      const topSelectorAfter = `${topSelector}::after`;

      const result = parseRulesNoDebug(
        topSelector,
        { dark: true },
        {
          color: 'blue',
          [style.element.before]: {
            fontWeight: 'bold',
            color: 'purple'
          },
          [style.element.after]: {
            [style.prop.dark]: {
              color: 'red'
            },
            [style.prop.light]: {
              color: 'green'
            }
          }
        }
      );

      const expectedOutput = {
        [topSelector]: { 'color': 'blue' },
        [topSelectorBefore]: { 'font-weight': 'bold', 'color': 'purple' },
        [topSelectorAfter]: { 'color': 'red' },
      };

      expect(result).toMatchObject(expectedOutput);
    });

    it('supports pseudo-functions from the style helper', () => {
      const topSelectorNotHover = `${topSelector}:not(:hover)`;
      const topSelectorHref = `[href^="http"]`;

      const result = parseRulesNoDebug(
        topSelector,
        { dark: true },
        {
          color: 'blue',
          [style.not(style.hover)]: {
            fontWeight: 'bold',
            color: 'purple'
          },
          [style.attr.href.startsWithAny('http', 'https')]: {
            [style.nthOfType('even')]: {
              [style.prop.dark]: {
                color: 'red'
              },
              [style.prop.light]: {
                color: 'green'
              }
            }
          }
        }
      );

      const expectedOutput = {
        [topSelector]: {
          'color': 'blue'
        },
        [`${topSelector}[href^="http"]:nth-of-type(even),${topSelector}[href^="https"]:nth-of-type(even)`]: {
          'color': 'red'
        },
      };

      expect(result).toMatchObject(expectedOutput);
    });

    it('still supports the deprecated block matching helper', () => {
      const result = parseRulesNoDebug(
        topSelector,
        { mode: 'hi there', nextOne: 'dodgerblue' },
        {
          background: 'purple',
          fontFamily: 'deprecated-font',
          '__match': {
            mode: {
              fontFamily: 'yay font',
              color: 'green',
              textDecoration: 'underline'
            },
            nextOne: value => ({
              color: value
            })
          }
        }
      );

      expect(result[topSelector]).toMatchObject({
        'font-family': 'yay font',
        'color': 'dodgerblue',
        'background': 'purple',
        'text-decoration': 'underline'
      });
    });

    it('still supports the deprecated inline pattern matching', () => {
      const result = parseRulesNoDebug(
        topSelector,
        { mode: 'hi there', nextOne: 'dodgerblue' },
        {
          background: {
            mode: (value) => value === 'supersayan' && 'yellow',
            nextOne: value => `value:${value}`,
            default: 'orange'
          },
          fontFamily: 'deprecated-font',
          '__match': {
            mode: {
              fontFamily: 'yay font',
              color: 'green',
              textDecoration: 'underline'
            },
            nextOne: value => ({
              color: value
            })
          }
        }
      );

      expect(result[topSelector]).toMatchObject({
        'font-family': 'yay font',
        'color': 'dodgerblue',
        'background': 'value:dodgerblue',
        'text-decoration': 'underline'
      });
    });
  })
})

describe('stringifyRules', () => {
  it('should not fail spectacularly', () => {
    const fakeGeneratedClass = 'lol-what-1234';
    const fakeProps = { mode: 'something', nextOne: 'hello' };

    const result = parseAndStringify(fakeGeneratedClass, fakeProps, {
      fontSize: '10px',
      [mq('screen').from(500)]: {
        fakeAttribute: 'whats-up'
      },
      color: {
        mode: (value) => value + '-alright',
        kittensEverywhere: 'purple'
      },
      [style.prop.mode]: (value) => ({
        background: `${value}-alright`,
        [style.hover]: {
          background: 'red'
        }
      }),
      [style.prop.kittensEverywhere]: {
        background: 'purple'
      },
      [style.hover]: {
        textDecoration: 'underline'
      },
      [style.or(style.hover, style.focus)]: {
        [style.or(style.active, style.visited)]: {
          fontFamily: 'whatever',
          [style.or(style.element.before, style.element.after)]: {
            fontWeight: 'super-ultra-bold',
            [mq('screen').from(500)]: {
              fontFamily: 'helvetica-is-trendy'
            },
          }
        }
      },
      fontWeight: 'normal'
    });

    expect(result).toMatchSnapshot();
  });

  it('should use autoprefixer to generate vendor prefixes', () => {
    const fakeSelector = '.prefix-me';
    const fakeProps = {};

    const result = parseAndStringify(fakeSelector, fakeProps, {
      display: 'grid',
      userSelect: 'none'
    }) |> map(generateVendorPrefixes({
      browsers: 'last 4 versions',
      grid: true
    }))

    expect(result).toMatchSnapshot();
  });

});
