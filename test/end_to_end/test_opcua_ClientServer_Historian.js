/**
 * Created by Jeff Codling on 15-09-01.
 *
 * Testing of OPC UA Historian Access functionality
 */

require("requirish")._(module);

var should = require("should");
var assert = require("better-assert");
var async = require("async");
var util = require("util");
var _ = require("underscore");

var opcua = require("index");

var OPCUAClient = opcua.OPCUAClient;
var StatusCodes = opcua.StatusCodes;
var Variant = opcua.Variant;
var DataType = opcua.DataType;
var DataValue = opcua.DataValue;

var BrowseDirection = opcua.browse_service.BrowseDirection;
var debugLog = opcua.utils.make_debugLog(__filename);


var port = 2000;

var build_server_with_temperature_device = require("test/helpers/build_server_with_temperature_device").build_server_with_temperature_device;
var resourceLeakDetector = require("test/helpers/resource_leak_detector").resourceLeakDetector;

describe("testing Historian services", function() {

    var server, client, temperatureVariableId, endpointUrl;

    before(function (done) {
        resourceLeakDetector.start();
        server = build_server_with_temperature_device({port: port}, function (err) {
            endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl;
            temperatureVariableId = server.temperatureVariableId;
            done(err);
        });
    });

    beforeEach(function (done) {
        client = new OPCUAClient();
        done();
    });

    afterEach(function (done) {

        done();
    });

    after(function (done) {
        server.shutdown(function (err) {
            resourceLeakDetector.stop();
            done(err);
        });
    });

    it("T1 - a client should connect to a server, add a node to the Historian and disconnect ", function (done) {

        server.currentChannelCount.should.equal(0);

        client.protocolVersion = 0;

        var nodeIdToUse = "ns=2;s=SomeDate";

        async.series([
            function (callback) {
                client.connect(endpointUrl, callback);
            },
            function () {
                client.addEventHistory(nodeIdToUse);
            },
            function () {
                client.addVariableHistory(nodeIdToUse);
            },
            function (callback) {
                client.disconnect(callback);
            }
        ], done);

    });

});
