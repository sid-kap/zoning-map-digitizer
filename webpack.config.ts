import * as path from "path"
import * as webpack from "webpack"
const CopyWebpackPlugin = require("copy-webpack-plugin")

const config: webpack.Configuration = {
    entry: {
        app: [
            './src/index.ts'
        ],
        vendor: ["opencv.js"],
        // "pdf.worker": 'pdfjs-dist/build/pdf.worker.js'
    },

    plugins: [
        new webpack.optimize.CommonsChunkPlugin({
            name: "vendor",
        }),
        new CopyWebpackPlugin([{
            from: 'node_modules/pdfjs-dist/build/pdf.worker.js',
            to: 'pdf.worker.js'
        }])
    ],

    output: {
        path: path.resolve(__dirname + '/dist'),
        filename: '[name].js',
        // publicPath: '/assets/',
    },

    module: {
        rules: [
            {
                test: /\.(css|scss)$/,
                exclude: /node_modules/,
                use: [
                    'style-loader',
                    'css-loader',
                ]
            },
            {
                test:    /\.html$/,
                exclude: /node_modules/,
                loader:  'file-loader?name=[name].[ext]',
            },
            {
                test: /\.pug/,
                loaders: ['pug-loader'],
            },
            {
                test:    /\.tsx?$/,
                exclude: /node_modules/,
                loader:  'ts-loader',
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                exclude: /node_modules/,
                loader: 'url-loader?limit=10000&mimetype=application/font-woff',
            },
            {
                test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                exclude: /node_modules/,
                loader: 'file-loader',
            },
            {
                test: /\.rs$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'wasm-loader'
                    },
                    {
                        loader: 'rust-native-wasm-loader',
                        options: {
                            release: true
                        }
                    }
                ]
            },
            {
                test: /\.worker\.js$/,
                exclude: /node_modules/,
                use: { loader: 'worker-loader' }
            },
            {
                test: require.resolve('opencv.js'),
                use: [{
                    loader: 'expose-loader',
                    options: 'cv',
                }],
            },
            {
                test: require.resolve('pdfjs-dist'),
                use: [{
                    loader: 'expose-loader',
                    options: 'PDFJS',
                }],
            }
        ],

        noParse: /\.elm$/,
    },

    devServer: {
        inline: true,
        stats: { colors: true },

        // contentBase: path.join(__dirname, "dist"),
    },

    node: { fs: 'empty' },

    devtool: "cheap-source-map"

    // minify: {
    //     mangle: false,
    // },

};

export default config
