import React from 'react';
import Enzyme, { mount, render } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

import shades from './with-react';
import { mq, style } from './helpers';

Enzyme.configure({ adapter: new Adapter() });

const replace = (searchValue, replaceValue) => (original) => (
  original.replace(new RegExp(searchValue, 'g'), replaceValue)
)

const getStylesheetContents = (styleElement) => (
  [...styleElement.sheet.cssRules]
    .map(item => item.cssText)
    .join('\n\n')
    |> replace('{', '{\n  ')
    |> replace('; ', ';\n  ')
    |> replace(';}', ';\n}')
)

describe('Shades DOM', () => {
  const mountShades = (data, options = { prefixer: true }) => {
    const stylesheetContainer = document.createElement('span');
    document.body.appendChild(stylesheetContainer);

    const renderedOutput = mount(
      <shades.Provider to={stylesheetContainer} {...options}>
        {data}
      </shades.Provider>
    );

    return {
      rendered: renderedOutput,
      stylesheet: getStylesheetContents(stylesheetContainer.querySelector('style'))
    };
  };

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

    expect(titleSubject.rendered).toMatchSnapshot();
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
        <Linky dark>Original Linky</Linky>
        <LinkyDuplicate dark>DUPLICATE linky</LinkyDuplicate>
      </div>
    );

    expect(duplicateSubject.rendered).toMatchSnapshot();

    const darkSubject = mountShades(
      <Linky dark>Hello</Linky>
    );

    expect(darkSubject.rendered).toMatchSnapshot();

    const noPropsSubject = mountShades(
      <Linky>No Props!</Linky>
    );

    expect(noPropsSubject.rendered).toMatchSnapshot();
  });

  // Skipped due to a bug with an Enzyme library (Function.prototype.name and is-callable)
  // causing proxy-wrapped component constructors to throw an exception when attempting to
  // use the find method, essentially saying that the component is not a function (when it is).
  // UPDATE: seems that this is no longer an issue, cautious optimism
  it('Forwards valid DOM props', () => {
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

    const anchorItem = subject.rendered.find('a');

    expect(anchorItem).toHaveProp('href', 'hello.html');
    expect(anchorItem).toHaveProp('data-testing', 'just a test');
    expect(anchorItem).toHaveProp('aria-label', 'hello');
    expect(anchorItem).not.toHaveProp('superDark');
  });

  it('lets you escape from the html attribute filter by prefixing with "html-"', () => {
    const Linky = shades.a({
      color: 'blue'
    })

    const subject = mountShades(
      <Linky nodice="not a valid attribute" html-foobar="passed through anyway">Hello</Linky>
    );

    const anchorItem = subject.rendered.find('a');

    expect(anchorItem).toHaveProp('foobar')
    expect(anchorItem).not.toHaveProp('nodice');
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

    expect(darkSubject.stylesheet).toContain('background: purple;');
    expect(darkSubject.stylesheet).toContain('font-weight: 600;');
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

    expect(subjectPrimary.stylesheet).toMatchSnapshot();
    expect(subjectSecondary.stylesheet).toMatchSnapshot();
  });

  it('allows generic components to be extended', () => {
    const Primary = shades.generic({
      width: 10,
      color: 'blue'
    });

    expect(Primary.extend).toBeDefined();
    expect(Primary.meta.styles).toHaveProperty('color', 'blue');

    const ExtendedPrimary = Primary.extend({
      color: 'purple'
    });

    expect(ExtendedPrimary.meta.styles).toHaveProperty('color', 'purple');
  });


  it('allows generic elements to be extended before and after component wrapping', () => {
    const Primary = shades.generic({
      width: 10,
      color: 'blue'
    });

    const Secondary = Primary(({ className, foobar }) => (
      <div className={className}>Foobar is {foobar}</div>
    ));

    expect(Secondary.meta.styles).toHaveProperty('color', 'blue');

    expect(Secondary.extend).toBeDefined();

    const Tertiary = Secondary.extend({
      color: 'purple'
    });

    expect(Tertiary.meta.styles).toHaveProperty('color', 'purple');
  });

  it('should allow styles to apply to custom components', () => {
    const SuperStyle = shades.generic({
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

    expect(subject.rendered).toMatchSnapshot();
  });

  it('really does the autoprefixing it is supposed to do', () => {
    const Howdy = shades.button({
      userSelect: 'none',
      display: 'grid'
    });

    const subject = mountShades(
      <Howdy />
    );

    expect(subject.stylesheet).toContain('-user-select:');
  });

  it('does not strip out advanced font rules', () => {
    const Icon = shades.span({
      lineHeight: 1,
      fontWeight: 'normal',
      fontStyle: 'normal',
      letterSpacing: 'normal',
      textTransform: 'none',
      fontFamily: 'Material Icons',
      whiteSpace: 'nowrap',
      wordWrap: 'normal',
      direction: 'ltr',
      fontFeatureSettings: 'liga',
      fontSmoothing: 'antialiased'
    });

    const subject = mountShades(<Icon />);

    expect(subject.stylesheet).toContain('font-feature-settings:');
    expect(subject.stylesheet).toContain('font-smoothing:');
  });

  it('properly merges extended style rules', () => {
    const Icon = shades.span({
      background: 'purple',
      border: '1px solid black',
      color: 'white',
      [style.prop.primary]: {
        fontWeight: 600,
        [style.hover]: {
          textDecoration: 'underline',
          borderColor: 'red'
        }
      }
    }).extend({
      background: 'black',
      border: '2px solid purple',
      [style.prop.primary]: {
        textTransform: 'uppercase',
        [style.hover]: {
          borderColor: 'green'
        }
      }
    });

    const subject = mountShades(<Icon primary />);

    // I think this is working, but there's no way to *properly* guarantee This
    // in these unit tests yet (because of the leaky dom stuff)
    expect(subject.stylesheet).toMatchSnapshot();
  });
});
