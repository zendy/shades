import style, { parseStyleSymbol } from './style';
import { getDescriptor } from './style/selector-store';

const expectString = (original) => expect(original.toString());
const expectSymbol = (original) => expect(
  Symbol.keyFor(original.toString())
);

describe('style', () => {
  it('generates pseudo-classes from property getters', () => {
    expectString(
      style.hover
    ).toEqual(':hover');
    expectString(
      style.active
    ).toEqual(':active');
    expectString(
      style.focus
    ).toEqual(':focus');
    expectString(
      style.visited
    ).toEqual(':visited');
  });

  it('supports pseudo-class functions as methods', () => {
    expectString(
      style.nthChild('even')
    ).toEqual(':nth-child(even)');
    expectString(
      style.nthOfType('2n+1')
    ).toEqual(':nth-of-type(2n+1)');
  });

  it('has a method for generating custom or not-yet-supported pseudo-classes', () => {
    expectString(
      style.pseudo('sitting')
    ).toEqual(':sitting');
    expectString(
      style.pseudo('nthOfPerson', 'seated')
    ).toEqual(':nth-of-person(seated)')
  });

  it('generates pseudo-elements from property getters', () => {
    expectString(
      style.element.before
    ).toEqual('::before');
    expectString(
      style.element.after
    ).toEqual('::after')
  });

  it('has a method for generating custom or not-yet-supported pseudo-elements', () => {
    expectString(
      style.element('valhalla')
    ).toEqual('::valhalla');
    expectString(
      style.element('firstFewParagraphs')
    ).toEqual('::first-few-paragraphs')
  });

  it('supports the boolean not operator as a method', () => {
    expectString(
      style.not(style.hover)
    ).toEqual(':not(:hover)');
  });
  it('supports the and operator as a method', () => {
    expectSymbol(
      style.and(style.hover, style.focus)
    ).toEqual(':hover && :focus');
  });
  it('stores the descriptor that can be retrieved later', () => {
    const result = getDescriptor(style.and(style.hover, style.focus));

    expect(
      result
    ).toBeDefined();

  })
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
        expectString(
          style.attr.title
        ).toEqual('[title]');
      });

      it('supports attribute selectors that specify a matching value', () => {
        expectString(
          style.attr.href('https://example.org')
        ).toEqual('[href="https://example.org"]');
      });

      it('supports partial value matching on attribute values', () => {
        expectString(
          style.attr.href.contains('example')
        ).toEqual('[href*="example"]');

        expectString(
          style.attr.href.startsWith('#')
        ).toEqual('[href^="#"]');

        expectString(
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
        expectString(
          style.data.tooltip
        ).toEqual('[data-tooltip]');
      });

      it('supports partial value matching on data attributes', () => {
        expectSymbol(
          style.data.url.endsWithAny('.com', '.net', '.org')
        ).toEqual('[data-url$=".com"] || [data-url$=".net"] || [data-url$=".org"]');

        expectSymbol(
          style.data.validation.anyOf('date', 'email', 'phone')
        ).toEqual('[data-validation="date"] || [data-validation="email"] || [data-validation="phone"]');
      });

      it('supports combinators on attribute selectors', () => {
        expectSymbol(
          style.and(style.attr.src, style.attr.href.startsWith('https'))
        ).toEqual('[src] && [href^="https"]')
        expectSymbol(
          style.or(style.attr.src, style.attr.href.startsWith('https'))
        ).toEqual('[src] || [href^="https"]')
        expectSymbol(
          style.or(style.attr.src, style.attr.href.startsWithAny('http', 'https'))
        ).toEqual('[src] || [href^="http"] || [href^="https"]')
      });
    });

    describe('Properties', () => {
      it('supports special syntax for matching props (similar to attributes)', () => {
        expectString(
          style.prop.specialItem
        ).toEqual('!!specialItem');
      });
      it('supports matching for multiple props at once', () => {
        expectSymbol(
          style.props.all(style.prop.specialItem, style.prop.thingamabob)
        ).toEqual('!!specialItem && !!thingamabob')
      });
      it('supports matching against a subset of possible props', () => {
        expectSymbol(
          style.props.any(style.prop.specialItem, style.prop.thingamabob)
        ).toEqual('!!specialItem || !!thingamabob')
      });
    });
  });
  describe.skip('Globals', () => {
    describe('fontFace', () => {
      it('should generate a font face style object that can be added lazily to a stylesheet', () => {
        expect(
          style.fontFace({
            style: 'normal',
            weight: 600,
            src: [
              ['local', 'Monserrat Semibold'],
              ['local', 'Monserrat'],
              ['woff', '/fonts/whatever.woff']
            ]
          })
        ).toMatchObject({
          fontFace: [
            {
              fontStyle: 'normal',
              fontWeight: '600',
              src: 'local("Monserrat Semibold"), local("Monserrat"), url(/fonts/whatever.woff) format("woff")'
            }
          ]
        })
      });
      it('should allow a font family name to be specified', () => {
        expect(
          style.fontFace('Monserrat', {
            style: 'normal',
            weight: 600,
            src: [
              ['local', 'Monserrat Semibold'],
              ['local', 'Monserrat'],
              ['woff', '/fonts/whatever.woff']
            ]
          })
        ).toMatchObject({
          fontFace: [
            {
              fontFamily: 'Monserrat',
              fontStyle: 'normal',
              fontWeight: '600',
              src: 'local("Monserrat Semibold"), local("Monserrat"), url(/fonts/whatever.woff) format("woff")'
            }
          ]
        })
      });
      it('should allow multiple definitions in a single font face', () => {
        expect(
          style.fontFace({
            style: 'normal',
            weight: 600,
            src: [
              ['local', 'Monserrat Semibold'],
              ['local', 'Monserrat'],
              ['woff', '/fonts/whatever.woff']
            ]
          }, {
            style: 'normal',
            weight: 400,
            src: [
              ['local', 'Monserrat Regular'],
              ['local', 'Monserrat'],
              ['woff', '/fonts/whatever-regular.woff']
            ]
          })
        ).toMatchObject({
          fontFace: [
            {
              fontStyle: 'normal',
              fontWeight: '600',
              src: 'local("Monserrat Semibold"), local("Monserrat"), url(/fonts/whatever.woff) format("woff")'
            },
            {
              fontStyle: 'normal',
              fontWeight: '400',
              src: 'local("Monserrat Regular"), local("Monserrat"), url(/fonts/whatever-regular.woff) format("woff")'
            }
          ]
        })
      });
    });
  });
});
