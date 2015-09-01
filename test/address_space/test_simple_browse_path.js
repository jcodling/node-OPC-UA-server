require("requirish")._(module);
var should = require("should");
var assert = require("better-assert");
var util = require("util");
var path  = require("path");

var AddressSpace = require("lib/address_space/address_space").AddressSpace;

var constructBrowsePath = require("lib/address_space/address_space_browse").constructBrowsePath;
assert(constructBrowsePath);

var generate_address_space = require("lib/address_space/load_nodeset2").generate_address_space;
var makeNodeId = require("lib/datamodel/nodeid").makeNodeId;
var makeExpandedNodeId = require("lib/datamodel/expanded_nodeid").makeExpandedNodeId;


describe("constructBrowsePath and simpleBrowsePath", function () {

    var nodeset_filename = path.join(__dirname,"../../lib/server/mini.Node.Set2.xml");
    var address_space = new AddressSpace();

    before(function (done) {
        generate_address_space(address_space, nodeset_filename, function () {
            done();
        });
    });

    it(" should construct a browse path", function () {
        var browsePath = constructBrowsePath("/", "Folder.Foo.Bar.Fizz");
        browsePath._schema.name.should.eql("BrowsePath");
        browsePath.relativePath.elements.length.should.equal(4);
    });
    it(" should construct a browse path", function () {
        var browsePath = constructBrowsePath("/", "Objects.4:Boilers");
        browsePath._schema.name.should.eql("BrowsePath");
        browsePath.relativePath.elements.length.should.equal(2);

        browsePath.relativePath.elements[0].targetName.namespaceIndex.should.equal(0);
        browsePath.relativePath.elements[0].targetName.name.should.equal("Objects");

        browsePath.relativePath.elements[1].targetName.namespaceIndex.should.equal(4);
        browsePath.relativePath.elements[1].targetName.name.should.equal("Boilers");
    });
    it("should browse some path", function () {

        var nodeId = address_space.simpleBrowsePath("/", "Objects.Server");
        nodeId.should.eql(makeExpandedNodeId(2253));
        address_space.findObject(nodeId).browseName.toString().should.eql("Server");
    });

});


