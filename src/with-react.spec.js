import React from 'react';
import { mount, render } from 'enzyme';

import shades, { Shades } from './with-react';
import { states, mq } from './helpers';

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

    const subject = mountShades(
      <Title dark>Hello</Title>
    );

    expect(subject).toMatchSnapshot();
  });
  it('Forwards valid DOM props', () => {
    const Linky = shades.a({
      backgroundColor: {
        dark: 'blue',
        light: 'green',
        default: 'pink'
      },
      fontWeight: {
        dark: 600,
        light: 200
      },
      color: 'black'
    });

    const subject = mountShades(
      <Linky href="hello.html" superDark="yeah" data-testing="just a test" aria-label="hello">Hello</Linky>
    );

    const anchorItem = subject.find('a');;

    expect(anchorItem).toHaveProp('href', 'hello.html');
    expect(anchorItem).toHaveProp('data-testing', 'just a test');
    expect(anchorItem).toHaveProp('aria-label', 'hello');
    expect(anchorItem).not.toHaveProp('superDark');
  });
});
