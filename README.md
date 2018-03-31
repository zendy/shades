# Shades!

This is an experimental CSS-in-JS library, designed to be very similar to Glamorous, but supports rendering styles to shadow dom (or anywhere else you want, really)

Updates coming continuously, as we finish up our final testing and bug fixing, in preparation for rolling out to Bupa web platforms.

## Why

This library follows very closely with the syntax of certain prior-art, particularly: Glamorous.  Glamorous, in turn, follows a similar path to Aphrodite.  I looked into the pros and cons of both the Object-Literal style and the Template Literal style for building Shades, and decided to pursue the former, not because template literals are unfamiliar, but because I felt that the reasons I had for even considering a CSS-in-JS library were to get away from the CSS language.  So it made most sense to me to stay closer to JavaScript, in this case.  One day in the future this may change, but for now, if you want Template Literal syntax in addition to the Object Literal syntax, you will need to submit a PR :)

The Architecture we are moving towards at Bupa is something we like to call Valhalla.  It's a Monorepo Front-End architecture, which exposes modular web-components that serve as render targets for the underlying React components, where the actual UI logic comes from.  This is in order to allow us full flexibility and choice in the technology we want to use, while using smoke-and-mirrors to allow certain CMS solutions the illusion of full rendering control (Which they seem to demand for no good reason - and it had forced us to use Angular for a lot longer than we wanted)

This presented a problem when we wanted to use CSS-in-JS libraries such as Glamorous and Styled-Components.  We immediately discovered that there is a style boundary between elements in the shadow dom and the parent document.  Most CSS in JS libraries render the style tags to the `head` of the parent document, and have no ability to configure that behaviour to point to the Shadow DOM instead.  So, I decided it was time to have a go at making one of these myself.

Shout out to the wonderful creators of the Emotion library for their blog post on this subject, on which this library drew its initial inspiration.

## Peer Dependencies

Please ensure you install all the peer dependencies that are mentioned by yarn/npm after installing this package, if any.  This will not work without them.

## Usage

### Simple Tutorial

This assumes you're going to be using React.  There is an agnostic `css` function that you can also use, but it's somewhat verbose.  Documentation for it will be coming later on.

`yarn add @bupa-digital/shades`

The most important part of using Shades is the Shades provider - similar to Redux and other libraries, we use a Provider to supply a render target to all Shades elements that might be used inside the render tree.  This also means that you can have different Shades instances with different render targets for different shadow doms.

Here's an example of what a top level web component might look like:

`components/App.js`:

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import { Shades } from '@bupa-digital/shades/react';

import CounterView from './CounterView';

customElements.define('counter-view', class extends HTMLElement {
  getAllAttributes() {
    const getAttr = (name) => this.getAttribute(name);

    const attributeNames = this.getAttributeNames();
    const attributeObj = attributeNames.reduce((result, attrKey) => ({
      ...result,
      [attrKey]: getAttr(attrKey)
    }), {});

    return attributeObj;
  }
  connectedCallback() {
    // Always use mode: open, never use mode: closed.
    const shadowRoot = this.attachShadow({ mode: 'open' });
    const attrs = this.getAllAttributes();
    // To support web compoment children in your react element
    const children = <slot />;

    const props = {
      ...attrs,
      children
    };

    ReactDOM.render(
      <Shades to={shadowRoot}>
        <CounterView {...props} />
      </Shades>
    )
  }
});
```

And to use shades to style stuff, here's an example of most of its functionality:

`components/CounterView.js`

```javascript
import React from 'react';
import shades from '@bupa-digital/shades/react';
import { states } from '@bupa-digital/shades/helpers';

const colours = {
  button: {
    dark: '#00335b',
    light: '#0079c8',
    border: {
      dark: '#000000'
    }
  },
  text: {
    dark: '#ffffff',
    light: '#000000'
  }
}

// Here we showcase a few magical features you can use in shades rules,
// specifically, you can use functions that take props as rules,
// and even do pattern matching on props!
const Button = shades.button({
  border: '1px solid',
  borderColor: {
    dark: colours.button.border.dark
  },
  backgroundColor: {
    dark: colours.button.dark,
    light: colours.button.light,
    // Yep, even functions can be used in pattern matching. In this case,
    // `value` is the value of the `mode` property, if its defined.
    // If `mode` is not `super`, then this fn returns undefined, and
    // this property will be skipped.
    mode: value => value === 'super' && 'yellow',
    default: '#ffffff'
  },
  // Yes, all props passed to this component can be used in both patterns and in functions
  color: ({ dark }) => dark && colours.text.dark,
  // Use the states helper to simplify pseudo selectors like hover, active and visited
  // Alternatively, just specify a key like [':hover']
  ...states({
    hover: {
      fontWeight: 'bold',
      textDecoration: 'underline',
      // You can even do media queries way down here
      ['@media screen and (max-width: 400px)']: {
        border: '1px dotted',
        ...states({
          active: {
            border: '2px dotted'
          }
        })
      }
    }
  })
});

export default () => {
  return (
    <div>
      <Button light>Hello there</Button>
      <Button dark>Goodbye there</Button>
      <Button mode="super">Goodbye there</Button>
      <Button>This is plain</Button>
    </div>
  )
}
```

More documentation coming soon, but I hope this helps you to get started.
