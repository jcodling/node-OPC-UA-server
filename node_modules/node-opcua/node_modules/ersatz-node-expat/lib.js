/**
 * License MIT
 */
var util = require('util');
var EventEmitter = require("events").EventEmitter;

/**
 * @class Parser
 * @param encoding
 * @constructor
 */
var Parser = function (encoding) {

    this._text = [];

    function _toMap(arr) {
        var m = {}
        arr.forEach(function (pair) {
            m[pair[0]] = pair[1];
        });
        return m;
    }

    var self = this;
    var xml = require("node-xml");
    self._xml = new xml.SaxParser(function (cb) {

        cb.onStartDocument(function () {

        });
        cb.onEndDocument(function () {
            self.emit("close");
        });
        cb.onStartElementNS(function (elem, attrs, prefix, uri, namespaces) {
            self.emit("startElement", elem, _toMap(attrs));
        });
        cb.onEndElementNS(function (elem, prefix, uri) {
            self.emit("endElement", elem);
        });
        cb.onCharacters(function (chars) {
            chars.split("\n").forEach(function (chunk) {
                self.emit("text", chunk);
            });
        });
    });

};
util.inherits(Parser, EventEmitter);

Parser.prototype.write = function (str) {
    this._text.push(str.toString());
};

Parser.prototype.end = function (data) {
    if (data) {
        this.write(data);
    }
    var aa = this._text.join("");
    this._xml.parseString(aa);
};

exports.Parser = Parser;
/*
var fs = require("fs");
var expat1 = __dirname + "/../node-expat";
var expat2 = __dirname + "/node_modules/node-expat";
if ((fs.existsSync(expat1) || fs.existsSync(expat2))) {
    console.log(" using fast node-expat");
    exports.Parser = require("node-expat").Parser;
} else {
    exports.Parser = Parser;
}

// var xml_lite = require("./node_modules/node-xml-lite/index.js");
var xml_lite = require("node-xml-lite");

var Parser2 = function () {
    // var xml_lite = require("./aa");
    this._xml = new xml_lite.XMLParser();
    this._stack =[];


util.inherits(Parser2, EventEmitter);

Parser2.prototype.write = function (str) {

    var buf = str; //new Buffer(str);
    var self = this;

    this._xml.parseBuffer(buf, buf.length, function (state, p1, p2) {

        console.log("state",state);
        if (self._wait_attrib === true && state != xml_lite.xtAttribute) {
            self.emit("startElement",self._elementName,self._attrib);
            self._wait_attrib=false;
        }
        switch(state) {
            case xml_lite.xtOpen:
                self._attrib = {};
                self._wait_attrib = true;
                self._elementName = p1;
                self._stack.push(p1);
                break;
            case xml_lite.xtClose:
                var name = self._stack.pop();
                self.emit("endElement",name);
                if (self._stack.length === 0 ) {
                    console.log("done");
                    self.emit("close");
                }
                break;
            case xml_lite.xtAttribute:
                self._attrib[p1] = p2;
                break;
            case xml_lite.xtText:
                self.emit("text", p1);
        }
        return true;
    });
};

Parser2.prototype.end = function (str) {
    var self = this;
    if (str) { self.write(str);}
};
exports.Parser = Parser;
*/
