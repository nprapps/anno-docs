'use strict';

var webpack = require('webpack');

module.exports = {
    entry: {
        bundle: './www/js/app.js',
        header: './www/js/analytics.js'
    },
    output: {
        path: './www/js',
        filename: '[name].min.js'
    },
    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
        }, {
            test: /\.json$/,
            loader: 'json-loader'
        }]
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin()
    ]
}
