const path = require("node:path");
const fs = require("node:fs");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const dotenv = require("dotenv");

module.exports = (env = {}, argv = {}) => {
  const production = argv.mode === "production";
  const mode = production ? "production" : "development";
  const profiles = Object.keys(env).filter(
    (key) => !key.startsWith("WEBPACK_") && key !== "name" && key !== "mock",
  );
  if (profiles.length > 1) throw new Error("Select one environment with --env <name>.");
  const profile = env.name ?? profiles[0] ?? mode;
  if (typeof profile !== "string" || !/^[a-zA-Z0-9_-]+$/.test(profile)) {
    throw new Error(
      "Environment names must contain only letters, numbers, underscores, or hyphens.",
    );
  }
  dotenv.config({
    path: [`.env.${profile}.local`, ".env.local", `.env.${profile}`, ".env"],
    quiet: true,
  });
  const mockEnabled = env.mock === true || env.mock === "true";
  const backend = process.env.BACKEND_URL || "http://127.0.0.1:7860";
  const prefixes = [
    "/api",
    "/health",
    "/ready",
    "/auth",
    "/me",
    "/admin",
    "/analytics",
    "/chat",
    "/search",
    "/tools",
    "/tool",
  ];
  const sharedPages = ["/chat", "/search", "/tools"];
  const hasPrefix = (pathname, prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`);

  return {
    mode,
    entry: "./src/main.tsx",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "assets/[name].[contenthash:8].js",
      chunkFilename: "assets/[name].[contenthash:8].js",
      assetModuleFilename: "assets/[name].[contenthash:8][ext]",
      publicPath: "/",
      clean: true,
    },
    resolve: { extensions: [".tsx", ".ts", ".jsx", ".js"] },
    devtool: production ? false : "eval-cheap-module-source-map",
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: "swc-loader",
            options: {
              jsc: {
                parser: { syntax: "typescript", tsx: true },
                target: "es2022",
                transform: { react: { runtime: "automatic" } },
              },
            },
          },
        },
        {
          test: /\.css$/,
          use: [
            production ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
            "postcss-loader",
          ],
        },
        {
          test: /\.scss$/,
          use: [
            production ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
            "sass-loader",
          ],
        },
        { test: /\.(png|jpe?g|gif|svg|webp|woff2?)$/i, type: "asset/resource" },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({ template: "./index.html" }),
      new webpack.DefinePlugin({
        "import.meta.env.VITE_DEBUG_PANELS": JSON.stringify(process.env.VITE_DEBUG_PANELS || ""),
      }),
      ...(production
        ? [new MiniCssExtractPlugin({ filename: "assets/[name].[contenthash:8].css" })]
        : []),
    ],
    optimization: {
      runtimeChunk: "single",
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: "react",
            priority: 20,
          },
          icons: { test: /[\\/]node_modules[\\/]lucide-react[\\/]/, name: "icons", priority: 20 },
        },
      },
    },
    ...(production
      ? {}
      : {
          devServer: {
            host: "127.0.0.1",
            port: 5173,
            hot: true,
            static: false,
            historyApiFallback: true,
            proxy: [
              {
                target: backend,
                context: (pathname, req) => {
                  if (
                    req.headers.accept?.includes("text/html") &&
                    sharedPages.some((prefix) => hasPrefix(pathname, prefix))
                  )
                    return false;
                  return prefixes.some((prefix) => hasPrefix(pathname, prefix));
                },
              },
            ],
            setupMiddlewares(middlewares) {
              // Serve only this development helper, never the repository root.
              middlewares.unshift({
                name: "dev-login",
                path: "/dev-login.html",
                middleware(req, res, next) {
                  if (req.method !== "GET" && req.method !== "HEAD") return next();
                  res.setHeader("Content-Type", "text/html; charset=utf-8");
                  res.end(fs.readFileSync(path.resolve(__dirname, "dev-login.html")));
                },
              });
              if (mockEnabled) {
                const mock = Promise.all([
                  import("./mocks/config.js"),
                  import("./mocks/middleware.js"),
                ]).then(([config, { createMockMiddleware }]) =>
                  createMockMiddleware(config.default),
                );
                middlewares.unshift({
                  name: "mock-api",
                  middleware(req, res, next) {
                    mock.then((handler) => handler(req, res, next)).catch(next);
                  },
                });
              }
              return middlewares;
            },
          },
        }),
    stats: "minimal",
  };
};
