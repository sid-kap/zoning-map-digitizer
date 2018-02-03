// @ts-check
'use strict';

require('ace-css/css/ace.css');

require('font-awesome/css/font-awesome.css');

// Require index.html so it gets copied to dist
require('./index.html');

var Lib = require('./Lib.ts');
var Main = require('./Main.tsx');

var React = require('react');
var ReactDOM = require('react-dom');

ReactDOM.render(React.createElement(Main.App, null), document.getElementById('main'));

// var Elm = require('./Main.elm');
// var mountNode = document.getElementById('main');

// .embed() can take an optional second argument. This would be an object describing the data we need to start a program, i.e. a userID or some token
// var app = Elm.Main.embed(mountNode);

// app.ports.fetchMap.subscribe(function(arg) {
//     console.log("fetchMap called!");
//     var result = Lib.fetchBerkeley(arg);
//     app.ports.mapResults.send(result);
// });
