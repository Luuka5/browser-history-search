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
        clean: true,
        library: {
            type: 'umd'
        }
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
                { from: 'src/manifest.json', to: 'manifest.json' },
                { from: 'src/popup.html', to: 'popup.html' },
                { from: 'src/chat.css', to: 'chat.css' },
                { from: 'src/icons', to: 'icons' }
            ]
        })
    ]
}; 