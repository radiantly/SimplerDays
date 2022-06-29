const path = require("path");
const autoPreprocess = require("svelte-preprocess");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const prod = process.env.NODE_ENV === "production";

module.exports = (env) => ({
  // the main app entry file
  entry: {
    app: ["./src/main.js"],
  },

  // directory to output files to
  output: {
    path: path.resolve(__dirname, "public/build/"),
    publicPath: env.PUBLIC_PATH || "/build/",
    filename: "bundle.js",
    clean: prod,
  },

  resolve: {
    alias: {
      svelte: path.dirname(require.resolve("svelte/package.json")),
    },
    extensions: [".mjs", ".js", ".svelte", ".ts"],
    mainFields: ["svelte", "browser", "module", "main"],
  },
  module: {
    rules: [
      {
        test: /\.svelte$/,
        use: {
          loader: "svelte-loader",
          options: {
            compilerOptions: {
              dev: !prod,
            },
            emitCss: true,
            hotReload: !prod,
            preprocess: autoPreprocess(),
          },
        },
      },
      {
        test: /node_modules\/svelte\/.*\.mjs$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              url: false, // necessary if you use url('/path/to/some/asset.png|jpg|gif')
              sourceMap: !prod,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "node_modules/node-unrar-js/esm/js/*.wasm",
          to: "[name][ext]",
        },
      ],
    }),
    new MiniCssExtractPlugin({ filename: "bundle.css" }),
  ],

  ...(prod
    ? {
        mode: "production",
      }
    : {
        mode: "development",
        devtool: "eval-cheap-module-source-map",
        devServer: {
          client: {
            reconnect: true,
          },
          compress: true,
          port: "auto",
        },
      }),
});
