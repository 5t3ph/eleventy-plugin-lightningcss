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
    customMedia: true,
    minify: true,
    sourceMap: false,
    visitors: [],
    customAtRules: {},
  };

  const {
    importPrefix,
    nesting,
    customMedia,
    minify,
    sourceMap,
    visitors,
    customAtRules,
  } = {
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

      // Support @import triggering regeneration for incremental builds
      // h/t @julientaq for the fix
      if (_inputContent.includes("@import")) {
        // for each file create a list of files to look at
        const fileList = [];

        // get a list of import on the file your reading
        const importRuleRegex =
          /@import\s+(?:url\()?['"]?([^'"\);]+)['"]?\)?.*;/g;

        let match;
        while ((match = importRuleRegex.exec(_inputContent))) {
          fileList.push(parsed.dir + "/" + match[1]);
        }

        this.addDependencies(inputPath, fileList);
      }

      let targets = browserslistToTargets(browserslist(browserslistTargets));

      return async () => {
        let { code } = await bundle({
          filename: inputPath,
          minify,
          sourceMap,
          targets,
          drafts: {
            nesting,
            customMedia,
          },
          customAtRules,
          visitor: composeVisitors(visitors),
        });
        return code;
      };
    },
  });
};
