"use strict";

process.env.BROWSERSLIST_IGNORE_OLD_DATA =
  process.env.BROWSERSLIST_IGNORE_OLD_DATA || "true";

const fs = require("fs");
const path = require("path");
const reactScriptsDirectory = path.dirname(
  require.resolve("react-scripts/package.json")
);
const chalk = require(
  require.resolve("react-dev-utils/chalk", { paths: [reactScriptsDirectory] })
);

const requiredFilesModule = require.resolve("react-dev-utils/checkRequiredFiles", {
  paths: [reactScriptsDirectory],
});
require(requiredFilesModule);
require.cache[requiredFilesModule].exports = function checkRequiredFiles(files) {
  let currentFilePath;

  try {
    files.forEach((filePath) => {
      currentFilePath = filePath;
      fs.accessSync(filePath, fs.constants.F_OK);
    });
    return true;
  } catch (error) {
    console.log(chalk.red("Could not find a required file."));
    console.log(chalk.red("  Name: ") + chalk.cyan(path.basename(currentFilePath)));
    console.log(chalk.red("  Searched in: ") + chalk.cyan(path.dirname(currentFilePath)));
    return false;
  }
};

require("react-scripts/scripts/build");
