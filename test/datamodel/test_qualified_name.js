/*global require,describe,it*/
require("requirish")._(module);
var should = require("should");

var QualifiedName = require("lib/datamodel/qualified_name").QualifiedName;

var coerceQualifiedName = require("lib/datamodel/qualified_name").coerceQualifyName;

describe("QualifedName", function () {


    it("should construct a qualified name", function () {
        var qn = new QualifiedName({});
        qn.namespaceIndex.should.eql(0);
        should(qn.name === null).be.equal(true);
    });
    it("testing qualified name toString", function () {
        var qn = new QualifiedName({name: "Hello"});
        qn.toString().should.eql("Hello");
    });
    it("testing qualified name toString", function () {
        var qn = new QualifiedName({namespaceIndex: 2, name: "Hello"});
        qn.toString().should.eql("2:Hello");
    });
    it("should coerce a string into a qualified name ", function () {
        var qn = coerceQualifiedName("Hello");
        qn.toString().should.eql("Hello");
    });
    it("should coerce a qualified name  into a qualified name ", function () {
        var qn = coerceQualifiedName({namespaceIndex: 0, name: "Hello"});
        qn.toString().should.eql("Hello");
    });
    it("should coerce a null object  into a null qualified name ", function () {
        var qn = coerceQualifiedName();
        should(qn).eql(null);
    });
});
