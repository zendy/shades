import style from './compat.js';

import selectorRegistry, {
  SPECIAL_TYPES
} from '../../registries/selectors';

const expectString = (original) => expect(
  original.toString().replace(SPECIAL_TYPES.DESCRIPTOR.PREFIX, '')
);

const expectDescriptor = (original) => expect(
  Symbol.keyFor(original)
)

describe('style (compatibility version, not using proxies)', () => {
  const RealProxy = Proxy;
  beforeAll(() => {
    global.Proxy = class extends RealProxy {
      constructor() {
        throw 'Proxy constructor should never be used';
      }
    }
  });

  afterAll(() => {
    global.Proxy = RealProxy;
  });


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
      style.elementOf('valhalla')
    ).toEqual('::valhalla');
    expectString(
      style.elementOf('firstFewParagraphs')
    ).toEqual('::first-few-paragraphs')
  });

  it('supports the boolean not operator as a method', () => {
    expectString(
      style.not(style.hover)
    ).toEqual(':not(:hover)');
  });
  it('supports the and operator as a method', () => {
    expectDescriptor(
      style.and(style.hover, style.focus)
    ).toEqual('combinator.and § :hover && :focus');
  });
  it('supports the or operator as a method', () => {
    expectDescriptor(
      style.or(style.hover, style.visited)
    ).toEqual('combinator.or § :hover || :visited')
  });
  it('supports different combinations of and + or combinators', () => {
    expectDescriptor(
      style.or(style.and(style.hover, style.focus), style.visited, style.active)
    ).toEqual('combinator.or § :hover && :focus || :visited || :active')
    expectDescriptor(
      style.and(style.or(style.hover, style.focus), style.visited, style.active)
    ).toEqual('combinator.and § :hover || :focus && :visited && :active')
  });

  describe('Attributes and props', () => {
    describe('Attributes', () => {
      it('supports HTML attribute selectors', () => {
        expectString(
          style.attr('title')
        ).toEqual('[title]');
      });

      it('supports attribute selectors that specify a matching value', () => {
        expectString(
          style.attr('href').equals('https://example.org')
        ).toEqual('[href="https://example.org"]');
      });

      it('supports partial value matching on attribute values', () => {
        expectString(
          style.attr('href').contains('example')
        ).toEqual('[href*="example"]');

        expectString(
          style.attr('href').startsWith('#')
        ).toEqual('[href^="#"]');

        expectString(
          style.attr('href').endsWith('.org')
        ).toEqual('[href$=".org"]');

        expectDescriptor(
          style.attr('href').endsWithAny('.com', '.net', '.org')
        ).toEqual('combinator.or § [href$=".com"] || [href$=".net"] || [href$=".org"]');

        expectDescriptor(
          style.attr('type').anyOf('button', 'text', 'date', 'email')
        ).toEqual('combinator.or § [type="button"] || [type="text"] || [type="date"] || [type="email"]');

        expectDescriptor(
          style.attr('href').startsWithAny('http', 'https', 'ftp')
        ).toEqual('combinator.or § [href^="http"] || [href^="https"] || [href^="ftp"]');
      });

      it('supports data attribute selectors with the .data method', () => {
        expectString(
          style.data('tooltip')
        ).toEqual('[data-tooltip]');
      });

      it('supports partial value matching on data attributes', () => {
        expectDescriptor(
          style.data('url').endsWithAny('.com', '.net', '.org')
        ).toEqual('combinator.or § [data-url$=".com"] || [data-url$=".net"] || [data-url$=".org"]');

        expectDescriptor(
          style.data('validation').anyOf('date', 'email', 'phone')
        ).toEqual('combinator.or § [data-validation="date"] || [data-validation="email"] || [data-validation="phone"]');
      });

      it('supports combinators on attribute selectors', () => {
        expectDescriptor(
          style.and(style.attr('src'), style.attr('href').startsWith('https'))
        ).toEqual('combinator.and § [src] && [href^="https"]')
        expectDescriptor(
          style.or(style.attr('src'), style.attr('href').startsWith('https'))
        ).toEqual('combinator.or § [src] || [href^="https"]')
        expectDescriptor(
          style.or(style.attr('src'), style.attr('href').startsWithAny('http', 'https'))
        ).toEqual('combinator.or § [src] || [href^="http"] || [href^="https"]')
      });
    });

    describe('Properties', () => {
      it('supports special syntax for matching props (similar to attributes)', () => {
        expectString(
          style.prop('specialItem')
        ).toEqual('!!specialItem');
      });
      it('supports matching for multiple props at once', () => {
        expectDescriptor(
          style.props.all(style.prop('specialItem'), style.prop('thingamabob'))
        ).toEqual('property.and § !!specialItem && !!thingamabob')
      });
      it('supports matching against a subset of possible props', () => {
        expectDescriptor(
          style.props.any(style.prop('specialItem'), style.prop('thingamabob'))
        ).toEqual('property.or § !!specialItem || !!thingamabob')
      });
    });
  });
});
