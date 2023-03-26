# Eleventy Plugin: LightningCSS

> Process CSS in Eleventy (11ty) with LightningCSS to minify, prefix, and add future CSS support.

Also respects either your package.json `browserslist` or a `.browserslistrc`, otherwise the default targets are `> 0.2% and not dead`.

Review [LightningCSS docs](https://lightningcss.dev/transpilation.html) to learn more about what future CSS features are supported via syntax lowering, including color functions, media query ranges, logical properties, and more.

> **Note**
> Requires Eleventy v2 - review [upgrade considerations](https://11ty.rocks/posts/new-features-upgrade-considerations-eleventy-version-2/) if applying to an existing project.

<small>If you want Sass support as well, use my [Sass + LightningCSS plugin](https://github.com/5t3ph/eleventy-plugin-sass-lightningcss) instead!</small>

## Features

LightningCSS minifies, prefixes, and enables transpiling based on your browserslist (or the included default) to gain future-CSS support today, with graceful upgrading as browser support improves.

It includes enables the following LightningCSS flags by default:

- [bundling](https://lightningcss.dev/bundling.html) - enables including other files via the `@import` syntax
- [nesting](https://lightningcss.dev/transpilation.html#nesting)
- [minify](https://lightningcss.dev/minification.html)
- [custom media queries](https://lightningcss.dev/transpilation.html#custom-media-queries)

## Usage

Install the plugin package:

```bash
npm install @11tyrocks/eleventy-plugin-lightningcss
```

Then, include it in your `.eleventy.js` config file:

```js
const lightningCSS = require("@11tyrocks/eleventy-plugin-lightningcss");

module.exports = (eleventyConfig) => {
  // If you already have a config, add just the following line
  eleventyConfig.addPlugin(lightningCSS);
};
```

⚠️ **Important**: The files will end up in `collections.all` and appear in places like RSS feeds where you may be using the "all" collection. To prevent that, [a temporary workaround](https://github.com/11ty/eleventy/discussions/2850#discussioncomment-5254892) is to create a directory data file to exclude your Sass files.

Place the following in the directory containing your Sass files. As an example, for a directory called `css` the file would be called `css/css.json`:

```js
{
  "eleventyExcludeFromCollections": true
}
```

Then, write your CSS using any organization pattern you like as long as it lives within your defined [Eleventy input directory](https://www.11ty.dev/docs/config/#input-directory).

> **Note**
> If you are already using PostCSS or Parcel, you will be doubling efforts with this plugin and should not add it.

## Config Options

### Base options

| Option        | Type    | Default |
| ------------- | ------- | ------- |
| importPrefix  | string  | '\_'    |
| nesting       | boolean | true    |
| customMedia   | boolean | true    |
| minify        | boolean | true    |
| sourceMap     | boolean | false   |
| visitors      | array   | []      |
| customAtRules | object  | {}      |

### Bundling Import Prefix

The plugin defaults to setting up 11ty to ignore CSS filenames prefixed with `_` (configure with `importPrefix`) so that those files do not end up as separate stylesheets in your final build. That way you can signify which CSS files you are including via the `@import` syntax.

### Extend LightningCSS with custom transforms

- Pass an array to `visitors` to include your own [custom transform functions](https://lightningcss.dev/transforms.html).
- Pass an object to `customAtRules` to [support your own at-rules](https://lightningcss.dev/transforms.html#custom-at-rules)

#### Example: Support mixins and static variables

Expand to see how to configure mixins and static variables as custom at-rules using the LightningCSS docs examples for [unknown and custom at-rules](https://lightningcss.dev/transforms.html#unknown-at-rules).

<details>
<summary>Support mixins and static variables</summary>

```js
let declared = new Map();
let mixins = new Map();

const rules = {
  Rule: {
    unknown(rule) {
      declared.set(rule.name, rule.prelude);
      return [];
    },
    custom: {
      mixin(rule) {
        mixins.set(rule.prelude.value, rule.body.value);
        return [];
      },
      apply(rule) {
        return mixins.get(rule.prelude.value);
      },
    },
  },
};

const tokens = {
  Token: {
    "at-keyword"(token) {
      return declared.get(token.value);
    },
  },
};

const atRules = {
  mixin: {
    prelude: "<custom-ident>",
    body: "style-block",
  },
  apply: {
    prelude: "<custom-ident>",
  },
};

module.exports = (eleventyConfig) => {
  eleventyConfig.addPlugin(lightningCSS, {
    customAtRules: atRules,
    visitors: [rules, tokens],
  });
};
```

</details>

## How does it work?

This plugin uses Eleventy's `addTemplateFormats` and `addExtension` features to essentiallly recognize CSS as a first-class templating language, and add custom processing. Since it makes CSS into a templating language, changes are applied during local development hot-reloading without a delay or requiring a manual browser refresh.
