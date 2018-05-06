import css, {
  parseAllStyles,
  parseAndStringify
} from './style-parser';

import {
  states,
  mq
} from './helpers';

import style from './helpers/style';

const parseRulesNoDebug = parseAllStyles
const parseRulesWithDebug = parseAllStyles

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
    const topSelectorHoverFocus = `${topSelector}:hover, ${topSelector}:focus`;

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
          fontWeight: '800'
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
        [style.prop.mode]: (value) => ({
          color: value === 'dark' && 'navy',
          padding: '100px'
        }),
        fontWeight: 'normal'
      });

      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toMatchObject({
        'font-size': '10px',
        'color': 'green',
        'padding': '100px',
        'font-weight': 'normal'
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

      console.log(
        result
      )

      const expectedOutput = {
        [topSelector]: {
          'color': 'blue'
        },
        [`${topSelector}[href^="http"]:nth-of-type(even), ${topSelector}[href^="https"]:nth-of-type(even)`]: {
          'color': 'red'
        },
      };

      expect(result).toMatchObject(expectedOutput);
    });

  })
})

describe('parseAndStringify', () => {
  it('should not fail spectacularly', () => {
    const fakeGeneratedClass = 'lol-what-1234';
    const fakeProps = { mode: 'something', nextOne: 'hello' };

    const result = parseAndStringify(fakeGeneratedClass, fakeProps, {
      fontSize: '10px',
      color: {
        mode: (value) => value + '-alright',
        kittensEverywhere: 'purple'
      },
      fontWeight: 'normal'
    });

    expect(result).toEqual([
      `${fakeGeneratedClass} { font-size: 10px;color: something-alright;font-weight: normal; }`
    ])
  });

});
