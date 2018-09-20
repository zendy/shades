# Style Composition with Generic Components

Shades comes with a mechanism for defining "generic" style components that can be composed around other components later.  To define a generic component, use the `generic` method from shades:

```js
import React from 'react';
import shades from '@bupa-digital/shades';
import { style } from '@bupa-digital/shades/helpers'

const BigText = shades.generic({
  fontSize: '24px',
  fontWeight: 600,
  fontFamily: 'Helvetica'
});
```

To use BigText, you can call it as a function (it's a Higher Order Component), passing in another component as its argument.  For example, if you wanted to use it on another Shades component, it's as easy as this:

```js
const BigListItem = BigText(shades.li({
  listStyle: 'square',
  [style.hover]: {
    backgroundColor: 'blue'
  }
}))
```

The BigText Higher-Order component will pass its classname down to the wrapped component, so if you want to wrap a custom component, make sure you handle the className property like so:

```js
const BigListItem = BigText(({ className, children }) => (
  <li className={className}>{children}</li>
))
```

Generic components are shades components in their own right, and thus can support all the pattern matching features that any other Shades component does.  This also means that you can make some very powerful composable styles.  For example, a generic style with `primary` and `secondary` modifiers can be defined like so:

```js
const BrandedText = shades.generic({
  [style.prop.primary]: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'dodgerblue',
    fontFamily: 'serif'
  },
  [style.prop.secondary]: {
    fontSize: '14px',
    fontWeight: 400,
    color: 'black',
    fontFamily: 'sans-serif'
  }
})

const HeroContainer = BrandedText(shades.header({
  width: '100%',
  padding: '10px'
}));

// please don't judge me, this markup is probably not perfectly semantic but it's just an example
const renderedPage = (
  <div>
    <article>
      <HeroContainer primary>This is the primary article</HeroContainer>
      <p>Some primary content</p>
      <article>
        <HeroContainer secondary>This is a secondary article</HeroContainer>
        <p>Some secondary content</p>
      </article>
    </article>
  </div>
)
```

If you want to use multiple generic components without lots of nesting, you can use the `.extends` method on any shades component, like so:

```js
const FooGeneric = shades.generic({
  fontSize: '14px'
});

const BarGeneric = shades.generic({
  fontWeight: 600,
  [style.hover]: {
    textDecoration: 'underline'
  }
});

const ListItemFooBar = shades.li({
  fontFamily: 'serif',
  color: 'dodgerblue'
}).extends(
  FooGeneric,
  BarGeneric
)
```
