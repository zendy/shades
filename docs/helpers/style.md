# `style` (Pseudo-Selectors, Attributes and Props)

The `style` helper is a DSL for handling pseudo-selectors, attributes, props, and includes many combinators for each.  It supports all known pseudo-classes, pseudo-elements and pseudo-functions, as well as many advanced features for selecting against attributes and their values.  Lastly, it includes special handlers for doing pattern-matching against props (React-only support for now).

Example:

```js
import React from 'react';
import shades from '@bupa-digital/shades/react';
import style from '@bupa-digital/shades/utils.style';

// A random collection of different style features
const PseudoIcon = shades.i({
  [style.element.before]: {
    // ::before
    fontSize: '15px',
    content: 'Hello there!'
  },
  [style.hover]: {
    // :hover
    [style.element.after]: {
      // :hover::after
      fontFamily: 'Material Icons',
      content: 'close'
      [style.prop.dark]: {
        color: 'white'
      },
      [style.props.all(style.prop.dark, style.prop.theme)]: ({ theme }) => ({
        background: theme.dark
      })
    }
  },
  [style.attr.title]: {
    // [title]
    fontSize: '20px'
  },
  [style.and(style.attr.href.startsWith('https'), style.attr.href.endsWithAny('jpg', 'png'))]: {
    // So its an image
    background: ({ href }) => `url(${href |> JSON.stringify})`
  }
});

// ... later that same day ...
return (
  <PseudoIcon theme={mySpecialTheme} dark href="https://example.com/img.png" />
);
```

## Pseudo-Selectors

There are 3 types of pseudo-selector:
1. pseudo-classes, like `hover`, `active` and `visited`
2. pseudo-elements, like `before`, `after` and `selection`
3. pseudo-functions, like `nth-child`, `not` and `lang`

You can find the list of supported pseudo-selectors [over here](#supported-pseudo-selectors)

You can use any of the supported pseudo-classes and pseudo-functions by name on the style object, like so:

```js
style.hover // :hover
style.focus // :focus
style.not(style.active) // :not(:active)
```

For pseudo-elements, you can access them also by name via `style.element`:

```js
style.element.before // ::before
style.element.after // ::after
```

Not the most exciting example, to be honest.  But where it really gets powerful is in using combinators (coming up in the next section)

### Escape-hatches

In case there are pseudo-selectors not yet supported out of the box, we've provided some escape hatches so you can define non-supported pseudos:

```js
style.pseudo('just-a-test') // :just-a-test
style.pseudo('custom-pseudo-function', 'hello') // :custom-pseudo-function(hello)
style.element('wow-amazing') // ::wow-amazing
```

There is also now an escape hatch for adding completely arbitrary selectors - which are tacked on to the end of the shades element's class selector, like all the others - and should only be used **SPARINGLY AND DELIBERATELY**, for times when there are no other suitable solutions.  In the future, this will be replaced by a special Shades DSL for selecting things.  If in doubt, don't use this!

```js
style.selector('div span > a[href] + label');
```

### Supported Pseudo-Selectors:

I opted to include all pseudo selectors that I could.  A few were left out deliberately, such as `host` and `host-context`, but please raise an issue if you need them or if we're missing any others.

#### Pseudo-Classes

- active
- any-link
- checked
- default
- disabled
- empty
- enabled
- first
- first-child
- first-of-type
- fullscreen
- focus
- hover
- indeterminate
- in-range
- invalid
- last-child
- last-of-type
- left
- link
- only-child
- only-of-type
- optional
- out-of-range
- read-only
- read-write
- required
- right
- root
- scope
- target
- valid
- visited

#### Pseudo-Functions

- any
- dir
- lang
- matches
- not
- nth-child
- nth-last-child
- nth-last-of-type
- nth-of-type

#### Pseudo-Elements

- before
- after
- backdrop
- cue
- first-letter
- first-line
- grammar-error
- placeholder
- selection
- spelling-error

## Combinators

Combinators are functions that combine more than one of something in particular ways.  Say for example you wanted a selector that would activate when the element was hovered and focussed at the same time.  Again, not the most exciting thing in the world:

```js
style.and(style.hover, style.focus) // :hover:focus
```

Or if the element is either hovered OR focussed:

```js
style.or(style.hover, style.focus) // :hover, :focus
```

But what about a situation whereby you wanted a more complicated selector, perhaps compounded combinators?

```js
style.and(style.hover, style.or(style.visited, style.active, style.not(style.onlyChild)))
// :hover:visited, :hover:active, :hover:not(:only-child)
```

That's all well and good, but it's still more to type than the CSS version - until we get to the next section and look at attributes!

The supported combinators are:
- `and` (which combines)
- `or` (which comma-separates)

> Combinators can be used with pseudo-selectors and attributes - however they **cannot** be used with props at this time, which have their own special combinators.

## Attributes

Since attributes can often be a mix of both specification-based and custom/arbitrary, we decided not to restrict the supported attributes to any predefined list.  Instead, you can select for any attribute name you like, both as simple presence selectors (`[title]`) and value expressions (`[title$="example"]`) with a nice DSL.

Some examples:

```js
style.attr.title // [title]
```

Simple presence selecctor.  If the title attribute is passed to the Shades element, this will activate.  Ya know, normal CSS stuff.  But then comes...

```js
style.attr.href.startsWithAny('http', 'https', 'ftp')
// [href^="http"], [href^="https"], [href^="ftp"]
```

Ok, now that's gotta be easier to type than the CSS version.

You can mix and match attribute and pseudo-selectors however you wish, just as you would in CSS:

```js
style.not(style.attr.href('localhost'))
// :not([href="localhost"])
style.and(style.attr.contains('example'), style.not(style.hover))
// [attr*="example"]:not(:hover)
```

Note that this will **not work** yet:

```js
style.not(style.and(style.hover, style.active)) // BREAKS SILENTLY
```

> Attempting to use combinators inside a pseudo-function **will break and not even warn you**, but it's on the list of things to make work.

One last thing, theres also built in support for data attributes, and they support everything that normal attributes do:

```js
style.data.specialValidation
// [data-special-validation]
style.data.specialValidation.anyOf('email', 'phone', 'date')
// [data-special-validation="email"], [data-special-validation="phone"], [data-special-validation="date"]
```

#### Supported Attribute Combinators

To select for an attribute with an exact value, you can just call the attribute like a method:
`style.attr.myAttribute('my value')` becomes `[my-attribute="my value"]`

The following methods and combinators are supported for attribute helpers:

- `anyOf(...values)` - select any of these exact values for the given attribute
- `contains(value)` - select only if the attribute contains the given value
- `containsAny(...values)` - select if any of the given values is found in the attribute value
- `startsWith(value)` - select if the attribute value starts with the given value
- `startsWithAny(...values)` - select if the attribute value starts with any of the given values
- `endsWith(value)` - select if the attribute value ends with the given value
- `endsWithAny(...values)` - select if the attribute value ends with any of the given values

## Properties and Pattern Matching

Property matching, also known as pattern matching, can be done with a similar syntax to attribute selectors, although there is not yet support for the various attribute combinators/value matching features of attribute selectors.  Example:

```js
style.prop.fancyGreetings
```

Although one thing you can do with property matching that you can't with all other features is the ability to specify a function that takes the property value as its argument, like so:

```js
const MoneyButton = shades.button({
  // Here, the `value` argument is set to the value of the `currencyType` property if it is provided
  [style.prop.currencyType]: (value) => value === 'dollars' && ({
    [style.element.before]: {
      // Whereas all other functions still receive all props as normal
      content: ({ amount }) => `Only $${amount}.99`
    }
  })
})

// A few lines later...

return (
  <MoneyButton currencyType="dollars" amount="39" />
)
```

You can also match against multiple properties, with the `any` and `all` combinators.  You can acccess the combinators via `props` rather than `prop`.  Example:

```js
style.props.any(style.prop.dollars, style.prop.euros)
// Will match if any of the given props are defined, in this case, dollars or euros
style.props.all(style.prop.currencyType, style.prop.amount)
// Will match only when all the given props are defined, in this ase. currencyType and amount
```

> Note: When using a function with a `props` coombinator, the function will receive all props, rather than just the target ones.

> Note: You **cannot** mix property matchers in pseudo/attribute combinators, i.e `style.any(style.hover, style.prop.fooBar)` - doing so could irreparably damage the fabric of reality and transform all physical matter into cosmic nothingness.
