# Style Composition with Generic Components

## Generic Components

Shades comes with a mechanism for defining "generic" style components that can be composed around other components later.  To define a generic component, use the `generic` method from shades:

```js
import React from 'react';
import shades from '@bupa-digital/shades';
import style from '@bupa-digital/shades/utils.style'

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

If you want to use multiple generic components without lots of nesting, you can use the `.extend` method on any shades component, like so:

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
}).extend(
  FooGeneric,
  BarGeneric
)
```

## Other ways to extend

Extending or merging styles with an existing shades element isn't limited to just generic components.  Using the `.extend` method like in the above example, you can pass any existing shades component, or plain object literal as arguments.  If you pass another shades component to `extend`, the styles from that component will be merged ontop of the styles of the component being extended (it will be a deep merge, so any duplicate keys containing nested style objects will be merged as well, rather than one replacing the other).  The same thing will happen if you pass in an object literal.

Here's an example where we extend all 3 possible types, merging them into a new component style for `MashedTogether`:

```js
const FirstGeneric = shades.generic({
  fontSize: '14px',
  [style.hover]: {
    textDecoration: 'underline',
    [style.prop.primary]: {
      border: '1px solid red'
    }
  }
});

const SecondButton = shades.button({
  [style.hover]: {
    color: 'red',
    [style.prop.primary]: {
      textDecoration: 'none',
      fontWeight: 'bold'
    }
  }
})

const ThirdPlainObject = {
  [style.hover]: {
    [style.prop.primary]: {
      textTransform: 'uppercase'
    }
  }
}

const MashedTogether = shades.div({
  background: 'blue',
  [style.hover]: {
    cursor: 'move',
    color: 'blue'
  }
}).extend(
  FirstGeneric,
  SecondButton,
  ThirdPlainObject
)
```

Rendering `<MashedTogether>` (without the `primary` property) will render CSS that looks like this:

```scss
.shades-div-generatedHash {
  background: blue; // base style
  font-size: 14px; // FirstGeneric
}

.shades-div-generatedHash:hover {
  cursor: move; // base style
  text-decoration: underline; // FirstGeneric
  color: red; // SecondButton
}
```

Then if we render it with `primary` like so: `<MashedTogether primary>`, we should get something that looks like this:

```scss
.shades-div-generatedHash {
  background: blue; // base style
  font-size: 14px; // FirstGeneric
}

.shades-div-generatedHash:hover {
  cursor: move; // base style
  border: 1px solid red; // FirstGeneric
  color: red; // SecondButton
  text-decoration: none; // SecondButton
  font-weight: bold; // SecondButton
  text-transform: uppercase; // ThirdPlainObject
}
```

Remember that the style merrging will go all the way down.  In the above example, all of the style objects that were merged together had styles for hover state, and all except one had styles for the `primary` prop from within the hover state.  If we had used the spread operator to combine 3 style objects each with a hover style, only the last object's hover styles would survive, since the spread operator only does a shallow merge, whereas our `.extend` method does a fully recursive merge for properties whose values are object literals.
