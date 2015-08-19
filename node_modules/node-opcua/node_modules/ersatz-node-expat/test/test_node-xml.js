/*global require,describe, it*/
var expat = require('node-expat');
var ersatz = require("../lib");
var should = require("should");


var fs = require("fs");


describe("compare node-expat  and erstatz-node-expat", function () {


    function perform_test(namespace) {

        var parser = new namespace.Parser('UTF-8');

        var infos = [];

        parser.on('startElement', function (name, attrs) {
            infos.push(['startElement', name, attrs]);
        });

        parser.on('endElement', function (name) {
            infos.push(['endElement', name]);
        });

        parser.on('text', function (text) {
            text = text.split("\n").join("").trim();
            if (text.length > 0) {
                infos.push(['text', text]);
            }
        });

        parser.on('error', function (error) {
            infos.push(['error', error]);
        });

        var xml_string = require("fs").readFileSync(__dirname + "/demo.xml");
        parser.write(xml_string);
        parser.end();

        return infos;
    }

    it("node-expat", function () {
        var infos1 = perform_test(expat);
        var infos2 = perform_test(ersatz);
        infos1.should.eql(infos2);

    });

    function performTestAsync(namespace, xmlfile, callback) {

        var map = {};

        function record(name) {
            if (map[name]) {
                map[name] += 1;
            } else {
                map[name] = 1;
            }
        }

        var parser = new namespace.Parser();
        parser.on('startElement', function (name, attrs) {
            record(name);
        });
        parser.on('endElement', function (name) {
        });
        parser.on('text', function (text) {
        });
        parser.on("close", function () {
            callback(map);
        });
        var fs = require('fs');
        var bomstrip = require('bomstrip');
        fs.createReadStream(xmlfile, "utf8").pipe(new bomstrip()).pipe(parser);
    }


    it("should handle a small xml file", function (done) {
        var xmlfile = __dirname + "/demo.xml";
        performTestAsync(ersatz, xmlfile, function (map) {
            Object.keys(map).length.should.be.greaterThan(2);
            done();
        });

    });
    it("should handle a utf8 xml file with a BOM", function (done) {
        // http://stackoverflow.com/questions/6302544/default-encoding-for-xml-is-utf-8-or-utf-16
        var xmlfile = __dirname + "/utf8-with_bom_example.xml";
        performTestAsync(ersatz, xmlfile, function (map) {
            Object.keys(map).length.should.be.greaterThan(2);
            done();
        });

    });
});
