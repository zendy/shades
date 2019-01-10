# `mq` (Media Queries)

The `mq` helper is a nice DSL for writing media queries.  It simply lets you use chained methods to create media query strings, which you can then use in your shades styles.  Note, you can also write media queries without this helper if you wish, as demonstrated in the [Readme example](/) of the `Button` component :)

Example:

```js
import React from 'react';
import shades from '@bupa-digital/shades/react';
import mq from '@bupa-digital/shades/utils.mq';
import style from '@bupa-digital/shades/utils.style'

export const ResponsiveButton = shades.button({
  border: '1px solid',
  [style.prop.dark]: {
    borderColor: colours.button.border.dark
  },
  // Here, the result of this chain will be:
  // `@media screen and (min-width:300px) and (max-width:750px)`
  [mq().screen().from(300).to(750)]: {
    border: '1px dotted',
    [style.active]: {
      border: '2px dotted'
    }
  }
})
```

The mq helper supports all valid media features and types from the CSS4 spec (as far as we know).  There are different ways each media feature can be used based on the specification:

- Range (features that can be specified as `min-` or `max-`)
- Boolean (features that are implicit booleans and need not be given a value)
- Enum (features that only allow certain globally-unique values)
- Value (features that can be given any value as-is)

## Range

Range features can be specified using the `from` and `to` methods.  Any feature that can be specified as `min` or `max` is a "range" feature.  The most commonly used range feature is `width`, so if you pass only a number to the range methods (or a string), it will be treated as a width value in pixels, e.g: `mq().from(300).to(700)` or `mq().from('300px').to('700px')` both output `(min-width:300px) and (max-width:700px)`.

You can specify other range values using an object literal.  This also allows you to specify multiple range values at once.  Example:

```js
mq().from({
  height: 700,
  aspectRatio: '2/5'
}).to({
  height: 1200,
  aspectRatio: '7/13'
});
// @media (min-height:700px) and (min-aspect-ratio:2/5) and (max-height:1200px) and (max-aspect-ratio:7/13)
```

> Note: Some features support [Magic Numbers](#magic-numbers), which add a default unit to plain number values.

Range features are:

- `width`
- `height`
- `deviceWidth`
- `deviceHeight`
- `aspectRatio`
- `deviceAspectRatio`
- `colour`
- `colourIndex`
- `monochrome`
- `resolution`

## Enum

There are only 2 enum features (because their values are unique enough for this type), `orientation` and `scan`.  The allowed values for enums have their own methods:

```js
mq().orientation('portrait');
// is the same as
mq().portrait();
// both output: @media (orientation:portrait)
mq().scan('interlace');
// is the same as:
mq().interlace();
// both output: @media (scan:interlace)
```

For orientation, you can call either `portrait` or `landscape` as methods.  For scan, there's `interlace` or `progressive`.

## Boolean

Features that can be implicit booleans can be called as methods without any arguments.  For example:

```js
mq().colour();
// @media (color)
```

> Note: Any feature methods which include the word "colour" will output "color" in order to match the spec.  You can also call the methods using either spelling, but obviously in our examples, we'll prefer the *correct* english version ;)

Boolean features are:

- `colour`
- `colourIndex`
- `monochrome`
- `grid`
- `hover`
- `anyHover`
- `invertedColours`

### Boolean keywords

There are some features which are effectively booleans (by taking either `none` or one specific value).  You can treat these features like other implicit booleans, by just calling the method with no value (which will set the true value), or passing `false` to set it to `none`.  You can even just pass the values yourself if you'd prefer.

Boolean keyword features are:

- `hover`:
  - true: `hover`
  - false: `none`
- `anyHover`:
  - true: `hover`
  - false: `none`
- `invertedColours`:
  - true: `inverted`
  - false: `none`

## Value

Features that can have values can be called as methods, passing the desired value as the only argument.  For example:

```js
mq().width('500em').height('100px');
// @media (width:500em) and (height:100px)
```

### `false` transformation:

Any media feature that can be set to `none` can be given a value of `false`, which will be transformed to `none` in the output.  Features that support this are:

- `pointer`
- `anyPointer`
- `update`
- `overflowBlock`
- `overflowInline`

## Magic Numbers

Magic Numbers are plain number values that, when supplied to features that support them, will be given a default unit.  Default units (and their supported media features) are:

- `px`:
  - `width`
  - `height`
  - `deviceWidth`
  - `deviceHeight`
- `dpi`:
  - `resolution`

## Media Types

There are 4 media types that can be called as methods as well.  They are:
- `screen`
- `print`
- `speech`
- `all`

Like implicit booleans, you just call the method without passing an argument, like so:

```js
mq().print().height(300);
// @media print and (height:300px)
mq().screen().speech().height(300);
// @media screen, speech and (height:300px)
```

You can also pass media types as arguments to the `mq` function itself, if you prefer:

```js
mq('screen', 'print').height(300);
// @media screen, print and (height:300px)
```

## Escape hatch

We've included an escape-hatch for cases where we may be missing a valid media feature, or you want to use an unofficial or experimental feature:

```js
mq().feature('gigantic-manatee', 'underwater');
// @media (gigantic-manatee:underwater)
```

## Operators

Unfortunately we don't currently have support for operators such as `not` and `or`.  I hope to add these in the future.

## More examples...

For more concrete usage examples, please take a look at the `mq.spec.js` file.
