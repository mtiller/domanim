# Goal

The goal of this project is to create a Javascript library to update the dom by
mapping arbitrary data to specific DOM modifications.

# Overall Design

This library should provide a function that when passed a special "mapping"
object (more on this in a moment), will return another function that, when
passed an ordinary Javascript object (which we will refer to as "the data
object") will use the data in that object to update DOM elements.

Note that the "data object" could be any arbitrary data. The values in the
mapping will be customized according to the expected "shape" of the data object.
But the library itself will know nothing about the data object except that it
was most likely parsed using `JSON.parse`.

The function signature should be:

```typescript
export function createProcessor(mapping: Record<string, Application | Application[]>): (data: unknown) => void {
    ...
}
```

The function should work as follows.

## Mapping

The mapping object is simply a set of keys and values associated with them.
These can be represented by a simple `Record<string, Application | Application[]>` in TypeScript.

### Keys

The keys in the mapping are just CSS selectors.

### Values

The value is either a single `Application` object or an array of `Application`
objects. Since the values contain Jsonata expressions and Jsonata expressions
can be compiled, the expressions that appear in the values should be compiled
once when the mapping is passed in for performance reasons.

The `Application` type is defined in TypeScript as follows:

```typescript
export interface TextApplication {
  to: "text";
  // JSonata expression used to evaluate the data object
  expr: string;
}

export interface AttrApplication {
  to: "attr";
  // Which attribute is being targeted
  attr: string;
  // JSonata expression used to evaluate the data object
  expr: string;
}

export interface ClassApplication {
  to: "class";
  // Which classname should be toggled
  name: string;
  // JSonata expression used to evaluate the data object
  expr: string;
}

export type Application = TextApplication | AttrApplication | ClassApplication;
```

For each data object, the code should perform a `document.querySelectorAll` for
each key value in the mapping. Then it should process each `Application` object.

For a text application object, it should replace the `textContent` field of all
nodes matching the selector with the stringified result of evaluating the `expr`
field as a JSonata expression using the data object as context.

The attribute application should do the same thing except that the evaluation
result should be injected as the value of the attribute specified by `attr` on
each matching node.

Finally, a class application should use the result of evaluating the JSonata
expression as a "truthy" value. If the result is truthy then the specified
`class` (as indicated by the `name` field) should be added to the list of
classes associated with the matching node. If it is falsy, the code should
ensure that that class is not present on any of the matching nodes.

## Use Case: Static Strings

There should also be a function named `createStringProcessor` that is passed the
mapping and a static string and returns a closure that processes each data
object. The string should be parsed by Cheerio and the modifications should be
applied using Cheerio selectors applied to the string. The function returned by
`createStringProcessor` should return a `string` (representing the full
serialized HTML/SVG) instead of void (as in the case of `createProcessor`).

Note that for optimization reasons, the `load` function from `Cheerio` should
only be called once per invocation of `createStringProcessor`.

The mapping should function exactly the same for this static case.

## Use Case: Numerical and Color Interpolation

Use the `registerFunction` API to add two new built-in functions for
JSonata.

### Numerical Interpolation

The first function is `interp(v, vmin, vmax, ymin, ymax)`. If the `v` argument
equals `vmin`, then the result of this function should be `ymin`. Similarly, if
the `v` argument equals `vmax`, then the result of this function should be
`ymax`. If `v` is between `vmin` and `vmax`, then the result of the function
should be linearly interpolated between `ymin` and `ymax`.

### Color Interpolation

The second function is `cinterp(v, vmin, vmax, cmin, cmax)`. This function
similar to `interp` except that `cmin` and `cmax` are **colors** and the
function should return an interpolated color. Use the NPM package `color-parse`
to parse `cmin` and `cmax` and then interpolate the components in the resulting
object to arrive at the interpolated color. The interpolation should also
handle interpolating alpha values if present.

# Demo

In a subdirectory called `demo` can you please use vite to create a demo web
application that demonstrates how this library works by rendering
`powerplant.svg` with modifications made using this library.
