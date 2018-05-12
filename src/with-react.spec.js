import React from 'react';
import { mount, render } from 'enzyme';

import shades, { Shades } from './with-react';
import { states, mq, style } from './helpers';

describe('Shades DOM', () => {
  const mountShades = (data) => mount(
    <Shades to={document.querySelector('head')}>
      {data}
    </Shades>
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

    const darkSubject = mountShades(
      <Linky dark>Hello</Linky>
    );
    expect(darkSubject).toMatchSnapshot();
    expect(darkSubject.find('a').exists()).toBeTruthy();

    const noPropsSubject = mountShades(
      <Linky>No Props!</Linky>
    );
    expect(noPropsSubject).toMatchSnapshot();
    expect(noPropsSubject.find('a').exists()).toBeTruthy();
  });

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

    const anchorItem = subject.find('a');

    expect(anchorItem).toHaveProp('href', 'hello.html');
    expect(anchorItem).toHaveProp('data-testing', 'just a test');
    expect(anchorItem).toHaveProp('aria-label', 'hello');
    expect(anchorItem).not.toHaveProp('superDark');
  });
});
