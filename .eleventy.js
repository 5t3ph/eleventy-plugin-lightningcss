const fs = require("node:fs");
const path = require("node:path");
const browserslist = require("browserslist");
const {
  bundle,
  browserslistToTargets,
  composeVisitors,
} = require("lightningcss");

// Set default transpiling targets
let browserslistTargets = "> 0.2% and not dead";

// Check for user's browserslist
try {
  const package = path.resolve(__dirname, fs.realpathSync("package.json"));
  const userPkgBrowserslist = require(package);

  if (userPkgBrowserslist.browserslist) {
    browserslistTargets = userPkgBrowserslist.browserslist;
  } else {
    try {
      const browserslistrc = path.resolve(
        __dirname,
        fs.realpathSync(".browserslistrc")
      );

      fs.readFile(browserslistrc, "utf8", (_err, data) => {
        if (data.length) {
          browserslistTargets = [];
        }

        data.split(/\r?\n/).forEach((line) => {
          if (line.length && !line.startsWith("#")) {
            browserslistTargets.push(line);
          }
        });
      });
    } catch (err) {
      // no .browserslistrc
    }
  }
} catch (err) {
  // no package browserslist
}

module.exports = (eleventyConfig, options) => {
  const defaults = {
    importPrefix: "_",
    nesting: true,
    minify: true,
    visitors: [],
    customAtRules: {},
  };

  const { importPrefix, nesting, minify, visitors, customAtRules } = {
    ...defaults,
    ...options,
  };

  // Recognize CSS as a "template language"
  eleventyConfig.addTemplateFormats("css");

  // Process CSS with LightningCSS
  eleventyConfig.addExtension("css", {
    outputFileExtension: "css",
    compile: async function (_inputContent, inputPath) {
      let parsed = path.parse(inputPath);
      if (parsed.name.startsWith(importPrefix)) {
        return;
      }

      let targets = browserslistToTargets(browserslist(browserslistTargets));

      return async () => {
        let { code } = await bundle({
          filename: inputPath,
          minify,
          sourceMap: false,
          targets,
          drafts: {
            nesting,
          },
          customAtRules,
          visitor: composeVisitors(visitors),
        });
        return code;
      };
    },
  });
};
