import style, { parseStyleSymbol } from './style';

const expectString = (original) => expect(original.toString());
const expectSymbol = (original) => expect(
  Symbol.keyFor(original.toString())
);

describe('style', () => {
  it('generates pseudo-classes from property getters', () => {
    expectSymbol(
      style.hover
    ).toEqual(':hover');
    expectSymbol(
      style.active
    ).toEqual(':active');
    expectSymbol(
      style.focus
    ).toEqual(':focus');
    expectSymbol(
      style.visited
    ).toEqual(':visited');
  });
  it('supports pseudo-class functions as methods', () => {
    expectSymbol(
      style.nthChild('even')
    ).toEqual(':nth-child(even)');
    expectSymbol(
      style.nthOfType('2n+1')
    ).toEqual(':nth-of-type(2n+1)');
  });
  it('supports the boolean not operator as a method', () => {
    expectSymbol(
      style.not(style.hover)
    ).toEqual(':not(:hover)');
  });
  it('supports the and operator as a method', () => {
    expectSymbol(
      style.and(style.hover, style.focus)
    ).toEqual(':hover && :focus');
  });
  it('supports the or operator as a method', () => {
    expectSymbol(
      style.or(style.hover, style.visited)
    ).toEqual(':hover || :visited')
  });
  it('supports different combinations of and + or combinators', () => {
    expectSymbol(
      style.or(style.and(style.hover, style.focus), style.visited, style.active)
    ).toEqual(':hover && :focus || :visited || :active')
    expectSymbol(
      style.and(style.or(style.hover, style.focus), style.visited, style.active)
    ).toEqual(':hover || :focus && :visited && :active')
  });

  describe('Attributes and props', () => {
    describe('Attributes', () => {
      it('supports HTML attribute selectors', () => {
        expectSymbol(
          style.attr.title
        ).toEqual('[title]');
      });

      it('supports attribute selectors that specify a matching value', () => {
        expectSymbol(
          style.attr.href('https://example.org')
        ).toEqual('[href="https://example.org"]');
      });

      it('supports partial value matching on attribute values', () => {
        expectSymbol(
          style.attr.href.contains('example')
        ).toEqual('[href*="example"]');

        expectSymbol(
          style.attr.href.startsWith('#')
        ).toEqual('[href^="#"]');

        expectSymbol(
          style.attr.href.endsWith('.org')
        ).toEqual('[href$=".org"]');

        expectSymbol(
          style.attr.href.endsWithAny('.com', '.net', '.org')
        ).toEqual('[href$=".com"] || [href$=".net"] || [href$=".org"]');

        expectSymbol(
          style.attr.type.anyOf('button', 'text', 'date', 'email')
        ).toEqual('[type="button"] || [type="text"] || [type="date"] || [type="email"]');

        expectSymbol(
          style.attr.href.startsWithAny('http', 'https', 'ftp')
        ).toEqual('[href^="http"] || [href^="https"] || [href^="ftp"]');
      });

      it('supports data attribute selectors with the .data method', () => {
        expectSymbol(
          style.attr.data.tooltip
        ).toEqual('[data-tooltip]');
      });

      it('supports partial value matching on data attributes', () => {
        expectSymbol(
          style.attr.data.url.endsWithAny('.com', '.net', '.org')
        ).toEqual('[data-url$=".com"] || [data-url$=".net"] || [data-url$=".org"]');

        expectSymbol(
          style.attr.data.validation.anyOf('date', 'email', 'phone')
        ).toEqual('[data-validation="date"] || [data-validation="email"] || [data-validation="phone"]');
      });
    });

    describe('Properties', () => {
      it('supports special syntax for matching props (similar to attributes)', () => {
        expectSymbol(
          style.prop('specialItem')
        ).toEqual('!!specialItem');
      });
    });
    describe('Parser helpers', () => {
      it('helps the parser to generate the more complicated selectors (e.g attribute combinators)', () => {
        const topSelector = '#hi-josh'; // :)
        const styleCombinatorOutput = style.or(
          style.hover,
          style.active,
          style.and(style.attr.href, style.attr.title)
        );

        const result = parseStyleSymbol(
          topSelector,
          styleCombinatorOutput
        );

        expect(result).toEqual(
          expect.arrayContaining([
            `${topSelector}:hover`,
            `${topSelector}:active`,
            `${topSelector}[href][title]`,
          ])
        );
      });

    })
  });
});
