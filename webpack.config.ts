import * as path from "path"
import * as webpack from "webpack"

const config: webpack.Configuration = {
    entry: {
        app: [
            './src/index.js'
        ],
    },

    output: {
        path: path.resolve(__dirname + '/dist'),
        filename: '[name].js',
        // publicPath: '/assets/',
    },

    module: {
        rules: [
            {
                test: /\.(css|scss)$/,
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
            // {
            //     test:    /\.elm$/,
            //     exclude: [/elm-stuff/, /node_modules/],
            //     loader:  'elm-webpack-loader?verbose=true&warn=true',
            // },
            {
                test:    /\.tsx?$/,
                exclude: [/elm-stuff/, /node_modules/],
                loader:  'ts-loader',
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'url-loader?limit=10000&mimetype=application/font-woff',
            },
            {
                test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'file-loader',
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
            },
            // {
            //     test: require.resolve('./src/Lib.ts'),
            //     use: [{
            //         loader: 'expose-loader',
            //         options: 'Lib',
            //     }],
            // },
        ],

        noParse: /\.elm$/,
    },

    devServer: {
        inline: true,
        stats: { colors: true },

        contentBase: path.join(__dirname, "dist"),
    },

    node: { fs: 'empty' },

    devtool: "cheap-source-map"

    // minify: {
    //     mangle: false,
    // },

};

export default config
