import React from 'react';
import { mount, render } from 'enzyme';

import shades from './with-react';
import { states, mq, style } from './helpers';

const getStylesheet = () => (
  [...document.querySelector('style[data-shades]').sheet.cssRules].map(item => item.cssText).join('\n\n')
)

describe('Shades DOM', () => {
  const mountShades = (data) => mount(
    <shades.Provider to={document.querySelector('head')} prefixer>
      {data}
    </shades.Provider>
  );

  it('Renders without incident', () => {
    const Title = shades.h1({
      backgroundColor: {
        dark: 'blue',
        light: 'green',
        default: 'pink'
      },
      fontWeight: {
        dark: 600,
        light: 200
      },
      color: 'black',
      [mq().screen().from(300).to(750)]: {
        backgroundColor: 'purple'
      }
    });

    const titleSubject = mountShades(
      <Title dark>Hello</Title>
    );

    expect(titleSubject).toMatchSnapshot();
  });

  it('renders a block matcher without incident', () => {
    const Linky = shades.a({
      background: 'purple',
      fontWeight: {
        dark: 600,
        light: 200
      }
    });

    const LinkyDuplicate = shades.a({
      background: 'purple',
      fontWeight: {
        dark: 600,
        light: 200
      }
    });

    const duplicateSubject = mountShades(
      <div>
        <Linky dark>Hello</Linky>
        <LinkyDuplicate dark>Hello</LinkyDuplicate>
      </div>
    );

    const darkSubject = mountShades(
      <Linky dark>Hello</Linky>
    );

    expect(darkSubject).toMatchSnapshot();

    const noPropsSubject = mountShades(
      <Linky>No Props!</Linky>
    );

    expect(noPropsSubject).toMatchSnapshot();
  });

  // Skipped due to a bug with an Enzyme library (Function.prototype.name and is-callable)
  // causing proxy-wrapped component constructors to throw an exception when attempting to
  // use the find method, essentially saying that the component is not a function (when it is).
  it.skip('Forwards valid DOM props', () => {
    const Linky = shades.a({
      color: 'pink',
      [style.prop.dark]: {
        color: 'blue',
        fontWeight: 600
      },
      [style.prop.light]: {
        color: 'green',
        fontWeight: 200
      },
      [style.or(style.hover, style.active)]: (allProps) => ({
        [style.prop.amazing]: amazing => amazing === allProps.amazing && ({
          color: 'hooray'
        })
      }),
      [style.props.all(style.prop.specialThing, style.prop.fantastic)]: {
        [style.element.before]: {
          content: 'hi there'
        }
      }
    });

    const subject = mountShades(
      <Linky href="hello.html" superDark="yeah" data-testing="just a test" aria-label="hello">Hello</Linky>
    );

    const anchorItem = subject.find('a');

    expect(anchorItem).toHaveProp('href', 'hello.html');
    expect(anchorItem).toHaveProp('data-testing', 'just a test');
    expect(anchorItem).toHaveProp('aria-label', 'hello');
    expect(anchorItem).not.toHaveProp('superDark');
  });

  it('should write the expected styles to the stylesheet', () => {
    const Linky = shades.a({
      background: 'purple',
      [style.prop.dark]: {
        fontWeight: 600
      },
      [style.prop.light]: {
        fontWeight: 200
      }
    });

    const darkSubject = mountShades(
      <Linky dark>Hello</Linky>
    );

    const styleSheetContents = [...document.querySelector('style[data-shades]').sheet.cssRules].map(item => item.cssText).join('\n\n');

    expect(styleSheetContents).toEqual(
      expect.stringContaining('background: purple;')
    );
    expect(styleSheetContents).toEqual(
      expect.stringContaining('font-weight: 600;')
    );
  });

  it('allows extending multiple generic components', () => {
    const PrimaryStyle = shades.generic({
      fontSize: '24px',
      [style.prop.primary]: {
        color: 'blue',
        [style.hover]: {
          textDecoration: 'underline'
        }
      }
    });

    const SecondaryStyle = shades.generic({
      fontSize: '12px',
      [style.prop.secondary]: {
        color: 'red',
        [style.hover]: {
          textDecoration: 'dotted'
        }
      }
    });

    const PrimarySecondaryLink = shades.a({
      fontSize: '32px',
      [style.hover]: {
        border: '1px solid #ccc'
      }
    }).extend(PrimaryStyle, SecondaryStyle);

    const subjectPrimary = mountShades(
      <PrimarySecondaryLink primary />
    );

    const subjectSecondary = mountShades(
      <PrimarySecondaryLink secondary />
    );

    expect(subjectPrimary).toMatchSnapshot();
    expect(subjectSecondary).toMatchSnapshot();
  });


  it('should allow styles to apply to custom components', () => {
    const SuperStyle = shades.withComponent({
      color: 'blue',
      fontWeight: 'bold',
      [style.prop.href]: {
        textDecoration: 'underline'
      }
    });

    const ShadyComponent = SuperStyle(({ className }) => (
      <div className={className}>
        Hello this is a test
      </div>
    ))

    const subject = mountShades(
      <ShadyComponent />
    );

    expect(subject).toMatchSnapshot();
  });

  it('really does the autoprefixing it is supposed to do', () => {
    const Howdy = shades.button({
      userSelect: 'none',
      display: 'grid'
    });

    const subject = mountShades(
      <Howdy />
    );

    expect(getStylesheet()).toContain('-user-select:');
  });

});
