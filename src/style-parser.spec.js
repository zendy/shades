import {
  parseRules,
  stringifyRules,
  compileToCss
} from './style-parser';


describe('parseRules', () => {
  it('takes an object of rules and gives me back some more rules as strings', () => {
    const topSelector = '#meow';

    const result = parseRules(topSelector, {}, {
      fontSize: '10px',
      color: 'blue',
      fontWeight: 'normal'
    });

    expect(result).toHaveProperty([topSelector]);
  })
  it('combines nested pseudo-elements and pseudo-selectors with the main selector', () => {
    const topSelector = '#meow';
    const topSelectorHover = [topSelector, 'hover'].join(':')
    const topSelectorBefore = [topSelector, 'before'].join('::')

    const result = parseRules(topSelector, {}, {
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

    console.log(result);

    expect(result).toHaveProperty([topSelector]);
    expect(result).toHaveProperty([topSelectorHover]);
    expect(result).toHaveProperty([topSelectorBefore]);
  })
  it('should shift at-rules up to the top level', () => {
    const topSelector = '#meow';
    const topSelectorHover = `${topSelector}:hover`;
    const mq = '@media screen and (max-width: 800px)';

    const result = parseRules(topSelector, { }, {
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


    console.log(result)

    console.log(compileToCss(topSelector, {}, {
      fontSize: '10px',
      color: 'blue',
      [mq]: {
        fontSize: '90px',
        background: 'green',
        ':hover': {
          border: '1px solid red',
          fontWeight: '800'
        }
      }
    }));

    expect(result).toHaveProperty([topSelector]);
    expect(result).toHaveProperty([mq, topSelector]);
    expect(result).toHaveProperty([mq, topSelectorHover]);
  });

  describe('Pattern matching', () => {
    it('supports pattern-matching rules for props', () => {
      const topSelector = '#meow';

      const result = parseRules(topSelector, { dark: true }, {
        fontSize: '10px',
        color: {
          dark: 'navy',
          default: 'green'
        },
        fontWeight: 'normal'
      });
      console.log(result);
      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toContain('color: navy;');
    })

    it('supports a default value when no pattern match found', () => {
      const topSelector = '#meow';

      const result = parseRules(topSelector, { }, {
        fontSize: '10px',
        color: {
          dark: 'navy',
          default: 'green'
        },
        fontWeight: 'normal'
      });
      console.log(result);
      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toContain('color: green;');
    })

    it('supports a pattern match rule as a function that takes the value of the named prop', () => {
      const topSelector = '#meow';

      const result = parseRules(topSelector, { mode: 'dark' }, {
        fontSize: '10px',
        color: {
          mode: (value) => value === 'dark' && 'navy',
          default: 'green'
        },
        fontWeight: 'normal'
      });

      console.log(result);
      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toContain('color: navy;');
    })

    it('tries the next valid match when the current matcher returns null, undefined, or false', () => {
      const topSelector = '#meow';

      const result = parseRules(topSelector, { mode: 'supersayan', nextOne: 'hello' }, {
        fontSize: '10px',
        color: {
          mode: (value) => value === 'dark' && 'navy',
          nextOne: 'purple',
          default: 'green'
        },
        fontWeight: 'normal'
      });

      console.log(result);
      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toContain('color: purple;');
    })

    it('uses the default value if the matched function returns null, undefined, or false', () => {
      const topSelector = '#meow';

      const result = parseRules(topSelector, { mode: 'supersayan' }, {
        fontSize: '10px',
        color: {
          mode: (value) => value === 'dark' && 'navy',
          default: 'green'
        },
        fontWeight: 'normal'
      });

      console.log(result);
      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toContain('color: green;');
    })

    it('uses only the first match found, even when there are multiple valid matches', () => {
      const topSelector = '#meow';

      const result = parseRules(topSelector, { mode: 'dark', nextOne: 'hello' }, {
        fontSize: '10px',
        color: {
          mode: (value) => value === 'dark' && 'navy',
          nextOne: 'purple',
          default: 'green'
        },
        fontWeight: 'normal'
      });

      console.log(result);
      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).toContain('color: navy;');
    })

    it('skips the rule entirely if there is no match and no default value', () => {
      const topSelector = '#meow';

      const result = parseRules(topSelector, { mode: 'something unknown', nextOne: 'hello' }, {
        fontSize: '10px',
        color: {
          mode: (value) => value === 'dark' && 'navy',
          kittensEverywhere: 'purple'
        },
        fontWeight: 'normal'
      });

      console.log(result);
      expect(result).toHaveProperty([topSelector]);
      expect(result[topSelector]).not.toEqual(expect.arrayContaining([
        expect.stringContaining('color:')
      ]));
    })
  })
})
