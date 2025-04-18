const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
        content: './src/content.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'manifest.json', to: 'manifest.json' },
                { from: 'popup.html', to: 'popup.html' },
                { from: 'chat.css', to: 'chat.css' },
                { from: 'icons', to: 'icons' }
            ]
        })
    ]
}; 