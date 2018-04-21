import css, {
  parseAllStyles,
  parseAndStringify
} from './style-parser';

import {
  states
} from './helpers';

const parseRulesNoDebug = parseAllStyles
const parseRulesWithDebug = parseAllStyles

describe('parseRules', () => {
  it('takes an object of rules and gives me back some more rules as strings', () => {
    const topSelector = '#meow';

    const result = parseRulesNoDebug(topSelector, {}, {
      fontSize: '10px',
      color: 'blue',
      fontWeight: 'normal'
    });

    expect(result).toHaveProperty([topSelector]);
  })
  it('combines nested pseudo-elements and pseudo-selectors with the main selector', () => {
    const topSelector = '#meow';
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

    expect(result[topSelector]).toEqual(
      expect.arrayContaining(['font-size: 10px;', 'color: blue;'])
    );
    expect(result[topSelectorHover]).toEqual(
      expect.arrayContaining(['color: red;'])
    );
    expect(result[topSelectorBefore]).toEqual(
      expect.arrayContaining(['content: "hi there";', 'border: 1px solid #000;'])
    );
  })
  it('supports the states.all helper', () => {
    const topSelector = '#meow';
    const topSelectorHover = `${topSelector}:hover`;
    const topSelectorFocus = `${topSelector}:focus`;

    const result = parseRulesNoDebug(topSelector, {}, {
      fontSize: '10px',
      color: 'blue',
      ...states.all('hover', 'focus')({
        color: 'purple',
        border: '1px solid #fff'
      })
    });

    expect(result).toHaveProperty([topSelectorHover]);
    expect(result).toHaveProperty([topSelectorFocus]);

    const expectedStyles = expect.arrayContaining(['color: purple;', 'border: 1px solid #fff;'])

    expect(result[topSelectorHover]).toEqual(
      expectedStyles
    );
    expect(result[topSelectorFocus]).toEqual(
      expectedStyles
    );
  })
  it('should shift at-rules up to the top level', () => {
    const topSelector = '#meow';
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

    expect(result[topSelector]).toEqual(
      expect.arrayContaining([
        'font-size: 10px;',
        'color: blue;',
        'bubbles: 1px solid black;'
      ])
    );
    expect(result[mq][topSelector]).toEqual(
      expect.arrayContaining([
        'font-size: 90px;',
        'background: green;'
      ])
    );
    expect(result[mq][topSelectorHover]).toEqual(
      expect.arrayContaining([
        'font-weight: 800;',
        'border: 1px solid red;'
      ])
    );
  });

  describe('Pattern matching', () => {
    it('supports pattern-matching rules for props', () => {
      const topSelector = '#meow';

      const result = parseRulesNoDebug(topSelector, { dark: true }, {
        fontSize: '10px',
        color: {
          dark: 'navy',
          default: 'green'
        },
        fontWeight: 'normal'
      });

      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toContain('color: navy;');
    })

    it('supports a default value when no pattern match found', () => {
      const topSelector = '#meow';

      const result = parseRulesNoDebug(topSelector, { }, {
        fontSize: '10px',
        color: {
          dark: 'navy',
          default: 'green'
        },
        fontWeight: 'normal'
      });

      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toContain('color: green;');
    })

    it('supports a pattern match rule as a function that takes the value of the named prop', () => {
      const topSelector = '#meow';

      const result = parseRulesNoDebug(topSelector, { mode: 'dark' }, {
        fontSize: '10px',
        color: {
          mode: (value) => value === 'dark' && 'navy',
          default: 'green'
        },
        fontWeight: 'normal'
      });


      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toContain('color: navy;');
    })

    it('tries the next valid match when the current matcher returns null, undefined, or false', () => {
      const topSelector = '#meow';

      const result = parseRulesNoDebug(topSelector, { mode: 'supersayan', nextOne: 'hello' }, {
        fontSize: '10px',
        color: {
          mode: (value) => value === 'dark' && 'navy',
          nextOne: 'purple',
          default: 'green'
        },
        fontWeight: 'normal'
      });

      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toContain('color: purple;');
    })

    it('uses the default value if the matched function returns null, undefined, or false', () => {
      const topSelector = '#meow';

      const result = parseRulesNoDebug(topSelector, { mode: 'supersayan' }, {
        fontSize: '10px',
        color: {
          mode: (value) => value === 'dark' && 'navy',
          default: 'green'
        },
        fontWeight: 'normal'
      });

      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toContain('color: green;');
    })

    it('uses only the first match found, even when there are multiple valid matches', () => {
      const topSelector = '#meow';

      const result = parseRulesNoDebug(topSelector, { mode: 'dark', nextOne: 'hello' }, {
        fontSize: '10px',
        color: {
          mode: (value) => value === 'dark' && 'navy',
          nextOne: 'purple',
          default: 'green'
        },
        fontWeight: {
          mode: 'bold'
        },
        __match: {
          mode: {
            color: 'blue',
            fontWeight: 'bold'
          }
        }
      });

      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toContain('color: navy;');
    })

    it('skips the rule entirely if there is no match and no default value', () => {
      const topSelector = '#meow';

      const result = parseRulesNoDebug(topSelector, { mode: 'something unknown', nextOne: 'hello' }, {
        fontSize: '10px',
        color: {
          mode: (value) => value === 'dark' && 'navy',
          kittensEverywhere: 'purple'
        },
        fontWeight: 'normal'
      });

      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).not.toEqual(expect.arrayContaining([
        expect.stringContaining('color:')
      ]));
    })

    it('will render a block of styles for a block pattern', () => {
      const topSelector = '#philip-is-awesome';

      const result = parseRulesNoDebug(
        topSelector,
        { mode: 'hi there', nextOne: 'dodgerblue' },
        {
          __match: {
            mode: {
              fontWeight: 'bold',
              color: 'purple'
            },
            nextOne: value => ({
              color: value,
              border: '1px solid #ccc'
            })
          }
        }
      );

      expect(result[topSelector]).toEqual(expect.arrayContaining([
        expect.stringContaining('font-weight: bold'),
        expect.stringContaining('color: dodgerblue')
      ]));
    });

    it('renders "before" and "after" keys as pseudo-elements', () => {
      const topSelector = '#philip-is-awesome';
      const topSelectorBefore = `${topSelector}::before`;
      const topSelectorAfter = `${topSelector}::after`;

      const result = parseRulesNoDebug(
        topSelector,
        { dark: true },
        {
          color: 'blue',
          before: {
            fontWeight: 'bold',
            color: 'purple'
          },
          after: {
            color: {
              dark: 'red',
              light: 'green'
            }
          }
        }
      );

      const expectedOutput = {
        [topSelector]: ['color: blue;'],
        [topSelectorBefore]: ['font-weight: bold;', 'color: purple;'],
        [topSelectorAfter]: ['color: red;'],
      };

      expect(result).toEqual(expectedOutput);
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
