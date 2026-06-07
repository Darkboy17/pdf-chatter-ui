"use strict";

// CRA 5 predates current Node and webpack-dev-server versions. Adapt its
// startup configuration locally so development remains quiet and reliable.
process.env.BABEL_ENV = "development";
process.env.NODE_ENV = "development";
process.env.BROWSERSLIST_IGNORE_OLD_DATA =
  process.env.BROWSERSLIST_IGNORE_OLD_DATA || "true";

const fs = require("fs");
const path = require("path");
const reactScriptsDirectory = path.dirname(
  require.resolve("react-scripts/package.json")
);
const fromReactScripts = (moduleName) =>
  require(require.resolve(moduleName, { paths: [reactScriptsDirectory] }));
const gracefulFs = fromReactScripts("graceful-fs");
const chalk = fromReactScripts("react-dev-utils/chalk");
const paths = require("react-scripts/config/paths");
const evalSourceMapMiddleware = fromReactScripts(
  "react-dev-utils/evalSourceMapMiddleware"
);
const noopServiceWorkerMiddleware = fromReactScripts(
  "react-dev-utils/noopServiceWorkerMiddleware"
);
const redirectServedPath = fromReactScripts(
  "react-dev-utils/redirectServedPathMiddleware"
);

const originalLstat = gracefulFs.lstat;
gracefulFs.lstat = function compatibleLstat(filePath, callback) {
  return originalLstat.call(gracefulFs, filePath, (error, stats) => {
    if (
      error &&
      error.code === "EINVAL" &&
      path.basename(filePath).toLowerCase() === "system volume information"
    ) {
      error.code = "EACCES";
    }
    callback(error, stats);
  });
};

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

const webpackConfigModule = require.resolve("react-scripts/config/webpack.config");
const createLegacyWebpackConfig = require(webpackConfigModule);

require.cache[webpackConfigModule].exports = function createWebpackConfig(environment) {
  const config = createLegacyWebpackConfig(environment);
  config.watchOptions = {
    ...(config.watchOptions || {}),
    ignored: /[\\/]System Volume Information(?:[\\/]|$)/i,
  };
  return config;
};

const serverConfigModule = require.resolve(
  "react-scripts/config/webpackDevServer.config"
);
const createLegacyServerConfig = require(serverConfigModule);

require.cache[serverConfigModule].exports = function createServerConfig(
  proxy,
  allowedHost
) {
  const config = createLegacyServerConfig(proxy, allowedHost);

  delete config.onBeforeSetupMiddleware;
  delete config.onAfterSetupMiddleware;

  config.setupMiddlewares = (middlewares, devServer) => {
    middlewares.unshift({
      name: "eval-source-map",
      middleware: evalSourceMapMiddleware(devServer),
    });

    if (fs.existsSync(paths.proxySetup)) {
      require(paths.proxySetup)(devServer.app);
    }

    middlewares.push({
      name: "redirect-served-path",
      middleware: redirectServedPath(paths.publicUrlOrPath),
    });
    middlewares.push({
      name: "noop-service-worker",
      middleware: noopServiceWorkerMiddleware(paths.publicUrlOrPath),
    });

    return middlewares;
  };

  return config;
};

require("react-scripts/scripts/start");
