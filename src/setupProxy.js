const { createProxyMiddleware } = require("http-proxy-middleware");


module.exports = function setupProxy(app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: process.env.BACKEND_PROXY_URL || "http://localhost:8000",
      changeOrigin: true,
      pathRewrite: { "^/api": "" },
    })
  );
};
