const path = require("path");
const VueLoaderPlugin = require("vue-loader/lib/plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const DotenvPlugin = require("dotenv-webpack");
const merge = require("webpack-merge");
const webpack = require("webpack");

const targetDir = path.normalize(path.join(__dirname, "dist"));

if (!process.env.NODE_ENV) {
  console.error("Please set NODE_ENV");
  process.exit(1);
}

const babelOpts = {
  presets: ["@babel/preset-env"],
};

const tsconfig = require("./tsconfig.json");
const pathAliases = Object.entries(tsconfig.compilerOptions.paths || []).reduce((aliases, pair) => {
  let alias = pair[0];
  if (alias.endsWith("/*")) alias = alias.slice(0, -2);

  let aliasPath = pair[1][0];
  if (aliasPath.endsWith("/*")) aliasPath = aliasPath.slice(0, -2);

  aliases[alias] = path.resolve(__dirname, aliasPath);
  return aliases;
}, {});

let config = {
  entry: "./src/main.ts",
  output: {
    filename: "[name].[hash].js",
    path: targetDir,
    publicPath: "/",
  },
  module: {
    rules: [
      // Vue / Babel / Typescript
      {
        test: /\.vue$/,
        use: ["vue-loader"],
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: babelOpts,
          },
          {
            loader: "ts-loader",
            options: {
              appendTsSuffixTo: [/\.vue$/],
            },
          },
        ],
      },
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: babelOpts,
        },
      },
      {
        test: /\.js$/,
        use: ["source-map-loader"],
        enforce: "pre",
      },

      // Stylesheets
      {
        test: /\.p?css$/,
        use: [
          "vue-style-loader",
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              ident: "postcss",
              plugins: (loader) => {
                const plugins = [
                  require("postcss-import")({
                    resolve(id, base, options) {
                      // Since WebStorm doesn't resolve imports from node_modules without a tilde (~) prefix,
                      // strip the tilde here to get the best of both worlds (webstorm support + postcss-import support)
                      if (id[0] === "~") id = id.slice(1);
                      // Call the original resolver after stripping the tilde
                      return require("postcss-import/lib/resolve-id")(id, base, options);
                    },
                  }),
                  require("postcss-nesting")(),
                  require("tailwindcss")(),
                ];

                if (process.env.NODE_ENV === "production") {
                  plugins.push(require("postcss-preset-env")(), require("cssnano")());
                }

                return plugins;
              },
            },
          },
        ],
      },

      // Images/files
      {
        test: /\.(png|jpg)$/i,
        use: {
          loader: "file-loader",
          options: {
            name: "[name]-[hash].[ext]",
          },
        },
      },

      // HTML
      {
        test: /\.html$/,
        use: [
          {
            loader: "html-loader",
            options: {
              root: path.resolve(__dirname, "src"),
              attrs: ["img:src", "link:href"],
              ...(process.env.NODE_ENV === "production" && {
                minimize: true,
                removeComments: true,
                collapseWhitespace: true,
              }),
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: "src/index.html",
      files: {
        css: ["./src/style/initial.pcss"],
        js: ["./src/main.ts"],
      },
    }),
    new DotenvPlugin({
      path: path.resolve(process.cwd(), "../.env"),
    }),
  ],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".mjs", ".vue"],
    alias: pathAliases,
  },
};

if (process.env.NODE_ENV === "web") config.plugins.push(new webpack.EnvironmentPlugin(["NODE_ENV", "API_URL"]));

if (process.env.NODE_ENV === "production") {
  config = merge(config, {
    mode: "production",
    devtool: "source-map",
  });
} else {
  config = merge(config, {
    mode: "development",
    devtool: "eval",
    devServer: {
      ...(process.env.DEV_HOST ? { host: process.env.DEV_HOST } : undefined),
      historyApiFallback: true,
      port: 1234,
    },
  });
}

module.exports = config;
