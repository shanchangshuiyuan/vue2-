const path = require("path");
const htmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: path.resolve(__dirname, "src/main.js"),
  output: {
    filename: "[name].bundle.js", //默认就是main.js 默认是dist
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: ["vue-loader"],
      },

      {
        test: /\.js$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
        exclude: /node_modules/, // 表示node_modules的下的文件不需要查找
      },

      {
        test: /\.css$/,
        use: ["vue-style-loader", "css-loader"], //从右向左执行
      },
    ],
  },
  plugins:[
    new htmlWebpackPlugin({
        template:path.resolve(__dirname,'public/index.html')
    })
  ]
};
