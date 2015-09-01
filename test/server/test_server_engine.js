require("requirish")._(module);
/* jslint */
/*global require,describe, it, before, after */
var should = require("should");
var server_engine = require("lib/server/server_engine");
var ServerEngine = server_engine.ServerEngine;

var resolveNodeId = require("lib/datamodel/nodeid").resolveNodeId;
var NodeClass = require("lib/datamodel/nodeclass").NodeClass;
var browse_service = require("lib/services/browse_service");
var BrowseDirection = browse_service.BrowseDirection;
var read_service = require("lib/services/read_service");
var TimestampsToReturn = read_service.TimestampsToReturn;
var util = require("util");
var NodeId = require("lib/datamodel/nodeid").NodeId;
var makeExpandedNodeId = require("lib/datamodel/expanded_nodeid").makeExpandedNodeId;
var assert = require("better-assert");
var AttributeIds = read_service.AttributeIds;

var DataType = require("lib/datamodel/variant").DataType;
var DataValue = require("lib/datamodel/datavalue").DataValue;
var StatusCodes = require("lib/datamodel/opcua_status_code").StatusCodes;
var makeNodeId = require("lib/datamodel/nodeid").makeNodeId;
var coerceNodeId = require("lib/datamodel/nodeid").coerceNodeId;

var VariableIds = require("lib/opcua_node_ids").VariableIds;
var Variant = require("lib/datamodel/variant").Variant;
var VariantArrayType = require("lib/datamodel/variant").VariantArrayType;

var server_NamespaceArray_Id = makeNodeId(VariableIds.Server_NamespaceArray); // ns=0;i=2255
var resourceLeakDetector = require("test/helpers/resource_leak_detector").resourceLeakDetector;

var assert_arrays_are_equal = require("test/helpers/typedarray_helpers").assert_arrays_are_equal;
var QualifiedName = require("lib/datamodel/qualified_name").QualifiedName;


describe("testing ServerEngine", function () {

    var engine, FolderTypeId, BaseDataVariableTypeId, ref_Organizes_Id;

    var defaultBuildInfo = {
        productName: "NODEOPCUA-SERVER",
        softwareVersion: "1.0",
        manufacturerName: "<Manufacturer>",
        productUri: "URI:NODEOPCUA-SERVER"
    };
    before(function (done) {

        resourceLeakDetector.start();
        engine = new ServerEngine({buildInfo: defaultBuildInfo});

        engine.initialize({nodeset_filename: server_engine.mini_nodeset_filename}, function () {

            FolderTypeId = engine.address_space.findObjectType("FolderType").nodeId;
            BaseDataVariableTypeId = engine.address_space.findVariableType("BaseDataVariableType").nodeId;
            ref_Organizes_Id = engine.address_space.findReferenceType("Organizes").nodeId;
            ref_Organizes_Id.toString().should.eql("ns=0;i=35");


            // add a variable as a Array of Double with some values
            var testArray = [];
            for (var i = 0; i < 10; i++) {
                testArray.push(i * 1.0);
            }

            engine.addVariable(
                engine.findObject("ObjectsFolder"),
                {
                    browseName: "TestArray",
                    nodeId: "ns=1;s=TestArray",
                    dataType: "Double",
                    value: {
                        get: function () {
                            return new Variant({
                                dataType: DataType.Double,
                                arrayType: VariantArrayType.Array,
                                value: testArray
                            });
                        },
                        set: null // read only
                    }
                }
            );

            // add a writable Int32
            engine.addVariable(
                engine.findObject("ObjectsFolder"),
                {
                    browseName: "WriteableInt32",
                    nodeId: "ns=1;s=WriteableInt32",
                    dataType: "Int32",
                    value: {
                        get: function () {
                            return new Variant({
                                dataType: DataType.Double,
                                arrayType: VariantArrayType.Array,
                                value: testArray
                            });
                        },
                        set: function (variant) {
                            // Variation 1 : synchronous
                            // assert(_.isFunction(callback));
                            return StatusCodes.Good;
                        }
                    }
                }
            );

            // add a writable Int32
            engine.addVariable(
                engine.findObject("ObjectsFolder"),
                {
                    browseName: "WriteableUInt32Async",
                    nodeId: "ns=1;s=WriteableUInt32Async",
                    dataType: "UInt32",
                    value: {
                        get: function () {
                            return new Variant({
                                dataType: DataType.Double,
                                arrayType: VariantArrayType.Array,
                                value: testArray
                            });
                        }

                    }
                }
            );
            done();
        });

    });
    after(function () {
        engine.shutdown();
        engine = null;
        resourceLeakDetector.stop();
    });

    describe("findReferenceType findReferenceTypeFromInverseName", function () {

        it("should provide a way to access a referenceType from its inverse name", function () {
            var address_space = engine.address_space;
            var n1 = address_space.findReferenceType("Organizes").nodeId;
            should(address_space.findReferenceType("OrganizedBy")).eql(undefined);

            var n2 = address_space.findReferenceTypeFromInverseName("OrganizedBy").nodeId;
            should(address_space.findReferenceTypeFromInverseName("Organizes")).eql(undefined);

            n1.should.equal(n2);

        });

        it("should normalize a {referenceType/isForward} combination", function () {
            var address_space = engine.address_space;

            address_space.normalizeReferenceType(
                {referenceType: "OrganizedBy", isForward: true}).should.eql(
                {referenceType: "Organizes", isForward: false}
            );

            address_space.normalizeReferenceType(
                {referenceType: "OrganizedBy", isForward: false}).should.eql(
                {referenceType: "Organizes", isForward: true}
            );
            address_space.normalizeReferenceType(
                {referenceType: "Organizes", isForward: false}).should.eql(
                {referenceType: "Organizes", isForward: false}
            );
            address_space.normalizeReferenceType(
                {referenceType: "Organizes", isForward: true}).should.eql(
                {referenceType: "Organizes", isForward: true}
            );
        });

        it("should provide a easy way to get the inverse name of a Reference Type", function () {
            var address_space = engine.address_space;

            address_space.inverseReferenceType("Organizes").should.eql("OrganizedBy");
            address_space.inverseReferenceType("ChildOf").should.eql("HasChild");
            address_space.inverseReferenceType("AggregatedBy").should.eql("Aggregates");
            address_space.inverseReferenceType("PropertyOf").should.eql("HasProperty");
            address_space.inverseReferenceType("ComponentOf").should.eql("HasComponent");
            address_space.inverseReferenceType("HistoricalConfigurationOf").should.eql("HasHistoricalConfiguration");
            address_space.inverseReferenceType("HasSupertype").should.eql("HasSubtype");
            address_space.inverseReferenceType("EventSourceOf").should.eql("HasEventSource");

            address_space.inverseReferenceType("OrganizedBy").should.eql("Organizes");
            address_space.inverseReferenceType("HasChild").should.eql("ChildOf");
            address_space.inverseReferenceType("Aggregates").should.eql("AggregatedBy");
            address_space.inverseReferenceType("HasProperty").should.eql("PropertyOf");
            address_space.inverseReferenceType("HasComponent").should.eql("ComponentOf");
            address_space.inverseReferenceType("HasHistoricalConfiguration").should.eql("HistoricalConfigurationOf");
            address_space.inverseReferenceType("HasSubtype").should.eql("HasSupertype");
            address_space.inverseReferenceType("HasEventSource").should.eql("EventSourceOf");
        });


    });

    it("should have a rootFolder ", function () {

        engine.rootFolder.hasTypeDefinition.should.eql(makeExpandedNodeId(FolderTypeId));

    });

    it("should find the rootFolder by browseName", function () {

        var browseNode = engine.findObject("RootFolder");

        browseNode.hasTypeDefinition.should.eql(makeExpandedNodeId(FolderTypeId));
        browseNode.should.equal(engine.rootFolder);

    });

    it("should find the rootFolder by nodeId", function () {

        var browseNode = engine.findObject("i=84");

        browseNode.hasTypeDefinition.should.eql(makeExpandedNodeId(FolderTypeId));
        browseNode.should.equal(engine.rootFolder);

    });

    it("should have an 'Objects' folder", function () {

        var rootFolder = engine.findObjectByBrowseName("Root");

        var objectFolder = engine.findObjectByBrowseName("Objects");

        assert(objectFolder !== null);
        objectFolder.parent.should.eql(rootFolder.nodeId);

    });

    it("should have an 'Server' object in the Objects Folder", function () {

        var serverObject = engine.findObjectByBrowseName("Server");
        var objectFolder = engine.findObjectByBrowseName("Objects");
        objectFolder.hasTypeDefinition.should.eql(makeExpandedNodeId(FolderTypeId));
        assert(serverObject !== null);
        serverObject.parent.should.eql(objectFolder.nodeId);

    });

    it("should have an 'Server.NamespaceArray' Variable ", function () {

        var serverObject = engine.findObjectByBrowseName("Server");
        //xx var objectFolder = engine.findObjectByBrowseName("Objects");

        var server_NamespaceArray_Id = makeNodeId(VariableIds.Server_NamespaceArray);
        var server_NamespaceArray = engine.findObject(server_NamespaceArray_Id);
        assert(server_NamespaceArray !== null);

        //xx console.log(require("util").inspect(server_NamespaceArray));

        server_NamespaceArray.should.have.property("parent");
        // TODO : should(server_NamespaceArray.parent !==  null).ok;


        server_NamespaceArray.parent.should.eql(serverObject.nodeId);


    });

    it("should have an 'Server.Server_ServerArray' Variable", function () {

        var serverObject = engine.findObjectByBrowseName("Server");
        var objectFolder = engine.findObjectByBrowseName("Objects");

        var server_NamespaceArray_Id = makeNodeId(VariableIds.Server_ServerArray);
        var server_NamespaceArray = engine.findObject(server_NamespaceArray_Id);
        assert(server_NamespaceArray !== null);
        //xx server_NamespaceArray.parent.should.eql(serverObject.nodeId);
    });

    it("should be possible to create a new folder under the 'Root' folder", function () {

        var objectFolder = engine.findObjectByBrowseName("Objects");

        var newFolder = engine.addFolder("ObjectsFolder", "MyNewFolder");
        assert(newFolder);

        newFolder.hasTypeDefinition.should.eql(FolderTypeId);
        newFolder.nodeClass.should.eql(NodeClass.Object);

//xx        console.log(require("util").inspect(newFolder));
        newFolder.parent.should.equal(objectFolder.nodeId);

    });

    it("should be possible to find a newly created folder by nodeId", function () {

        var newFolder = engine.addFolder("ObjectsFolder", "MyNewFolder");

        // a specific node id should have been assigned by the engine
        assert(newFolder.nodeId instanceof NodeId);
        newFolder.nodeId.namespace.should.eql(1);

        var result = engine.findObject(newFolder.nodeId);
        result.should.eql(newFolder);

    });

    it("should be possible to find a newly created folder by 'browse name'", function () {

        var newFolder = engine.addFolder("ObjectsFolder", "MySecondNewFolder");
        var result = engine.findObjectByBrowseName("MySecondNewFolder");
        assert(result !== null);
        result.should.eql(newFolder);
    });

    xit("should not be possible to create a object with an existing 'browse name'", function () {

        var newFolder1 = engine.addFolder("ObjectsFolder", "NoUniqueName");

        (function () {
            engine.addFolder("ObjectsFolder", "NoUniqueName");
        }).should.throw("browseName already registered");

        var result = engine.findObjectByBrowseName("NoUniqueName");
        result.should.eql(newFolder1);
    });

    it("should be possible to create a variable in a folder", function (done) {

        var newFolder = engine.addFolder("ObjectsFolder", "MyNewFolder1");

        var newVariable = engine.addVariable("MyNewFolder1",
            {
                browseName: "Temperature",
                dataType: "Float",
                value: {
                    get: function () {
                        return new Variant({dataType: DataType.Float, value: 10.0});
                    },
                    set: function () {
                        return StatusCodes.BadNotWritable;
                    }
                }

            });
        newVariable.hasTypeDefinition.should.equal(BaseDataVariableTypeId);
        newVariable.parent.should.equal(newFolder.nodeId);

        newVariable.readValueAsync(function (err, dataValue) {
            if (!err) {
                dataValue.statusCode.should.eql(StatusCodes.Good);
                dataValue.value.should.be.instanceOf(Variant);
                dataValue.value.value.should.equal(10.0);
            }
            done(err);
        });


    });

    it("should be possible to create a variable in a folder with a predefined nodeID", function () {

        engine.addFolder("ObjectsFolder", "MyNewFolder3");

        var newVariable = engine.addVariable("MyNewFolder3",
            {
                nodeId: "ns=4;b=01020304ffaa",  // << fancy node id here !
                browseName: "Temperature",
                dataType: "Double",
                value: {
                    get: function () {
                        return new Variant({dataType: DataType.Double, value: 10.0});
                    },
                    set: function () {
                        return StatusCodes.BadNotWritable;
                    }
                }

            });


        newVariable.nodeId.toString().should.eql("ns=4;b=01020304ffaa");


    });

    it("should be possible to create a variable in a folder that returns a timestamped value", function (done) {

        engine.addFolder("ObjectsFolder", "MyNewFolder4");

        var temperature = new DataValue({
            value: new Variant({dataType: DataType.Double, value: 10.0}),
            sourceTimestamp: new Date(Date.UTC(1999, 9, 9)),
            sourcePicoseconds: 10
        });

        var newVariable = engine.addVariable("MyNewFolder4",
            {
                browseName: "TemperatureWithSourceTimestamps",
                dataType: "Double",
                value: {
                    timestamped_get: function () {
                        return temperature;
                    }
                }
            });


        newVariable.readValueAsync(function (err, dataValue) {

            if (!err) {

                dataValue = newVariable.readAttribute(AttributeIds.Value, undefined, undefined);
                dataValue.should.be.instanceOf(DataValue);
                dataValue.sourceTimestamp.should.eql(new Date(Date.UTC(1999, 9, 9)));
                dataValue.sourcePicoseconds.should.eql(10);

            }
            done(err);
        });


    });

    it("should be possible to create a object in a folder", function () {

        var simulation = engine.addObjectInFolder("Objects", {
            browseName: "Scalar_Simulation",
            description: "This folder will contain one item per supported data-type.",
            nodeId: makeNodeId(4000, 1)
        });


    });

    it("should browse the 'Objects' folder for back references", function () {

        var browseDescription = {
            browseDirection: BrowseDirection.Inverse,
            nodeClassMask: 0, // 0 = all nodes
            referenceTypeId: "Organizes",
            resultMask: 0x3F
        };

        var browseResult = engine.browseSingleNode("ObjectsFolder", browseDescription);

        browseResult.statusCode.should.eql(StatusCodes.Good);
        browseResult.references.length.should.equal(1);

        browseResult.references[0].referenceTypeId.should.eql(ref_Organizes_Id);
        browseResult.references[0].isForward.should.equal(false);
        browseResult.references[0].browseName.name.should.equal("Root");
        browseResult.references[0].nodeId.toString().should.equal("ns=0;i=84");
        //xx browseResult.references[0].displayName.text.should.equal("Root");
        browseResult.references[0].typeDefinition.should.eql(makeExpandedNodeId(resolveNodeId("FolderType")));
        browseResult.references[0].nodeClass.should.eql(NodeClass.Object);


    });

    it("should browse root folder with referenceTypeId", function () {

        var browseDescription = {
            browseDirection: BrowseDirection.Both,
            referenceTypeId: "Organizes",
            includeSubtypes: false,
            nodeClassMask: 0, // 0 = all nodes
            resultMask: 0x3F
        };
        var browseResult = engine.browseSingleNode("Root", browseDescription);

        var browseNames = browseResult.references.map(function (r) {
            return r.browseName.name;
        });
        console.log(browseNames);

        browseResult.statusCode.should.eql(StatusCodes.Good);


        browseResult.references.length.should.equal(3);

        browseResult.references[0].referenceTypeId.should.eql(ref_Organizes_Id);
        browseResult.references[0].isForward.should.equal(true);
        browseResult.references[0].browseName.name.should.equal("Objects");
        browseResult.references[0].nodeId.toString().should.equal("ns=0;i=85");
        browseResult.references[0].displayName.text.should.equal("Objects");
        browseResult.references[0].nodeClass.should.eql(NodeClass.Object);
        browseResult.references[0].typeDefinition.should.eql(makeExpandedNodeId(resolveNodeId("FolderType")));

        browseResult.references[0].referenceTypeId.should.eql(ref_Organizes_Id);
        browseResult.references[1].isForward.should.equal(true);
        browseResult.references[1].browseName.name.should.equal("Types");
        browseResult.references[1].nodeId.toString().should.equal("ns=0;i=86");
        browseResult.references[1].typeDefinition.should.eql(makeExpandedNodeId(resolveNodeId("FolderType")));
        browseResult.references[1].nodeClass.should.eql(NodeClass.Object);

        browseResult.references[0].referenceTypeId.should.eql(ref_Organizes_Id);
        browseResult.references[2].isForward.should.equal(true);
        browseResult.references[2].browseName.name.should.equal("Views");
        browseResult.references[2].nodeId.toString().should.equal("ns=0;i=87");
        browseResult.references[2].typeDefinition.should.eql(makeExpandedNodeId(resolveNodeId("FolderType")));
        browseResult.references[2].nodeClass.should.eql(NodeClass.Object);

    });

    it("should browse root and find all hierarchical children of the root node (includeSubtypes: true)", function () {

        var browseDescription1 = {
            browseDirection: BrowseDirection.Forward,
            referenceTypeId: "Organizes",
            includeSubtypes: true,
            nodeClassMask: 0, // 0 = all nodes
            resultMask: 0x3F
        };
        var browseResult1 = engine.browseSingleNode("Root", browseDescription1);
        browseResult1.references.length.should.equal(3);

        var browseDescription2 = {
            browseDirection: BrowseDirection.Forward,
            referenceTypeId: "HierarchicalReferences",
            includeSubtypes: true, // should include also HasChild , Organizes , HasEventSource etc ...
            nodeClassMask: 0, // 0 = all nodes
            resultMask: 0x3F
        };
        var browseResult2 = engine.browseSingleNode("Root", browseDescription2);
    });

    it("should browse root folder with abstract referenceTypeId and includeSubtypes set to true", function () {

        var ref_hierarchical_Ref_Id = engine.address_space.findReferenceType("HierarchicalReferences").nodeId;
        ref_hierarchical_Ref_Id.toString().should.eql("ns=0;i=33");

        var browseDescription = new browse_service.BrowseDescription({
            browseDirection: BrowseDirection.Both,
            referenceTypeId: ref_hierarchical_Ref_Id,
            includeSubtypes: true,
            nodeClassMask: 0, // 0 = all nodes
            resultMask: 0x3F
        });
        browseDescription.browseDirection.should.eql(BrowseDirection.Both);

        var browseResult = engine.browseSingleNode("RootFolder", browseDescription);

        browseResult.statusCode.should.eql(StatusCodes.Good);

        browseResult.references.length.should.equal(3);

        browseResult.references[0].referenceTypeId.should.eql(ref_Organizes_Id);
        browseResult.references[0].isForward.should.equal(true);
        browseResult.references[0].browseName.name.should.equal("Objects");
        browseResult.references[0].nodeId.toString().should.equal("ns=0;i=85");
        browseResult.references[0].displayName.text.should.equal("Objects");
        browseResult.references[0].nodeClass.should.eql(NodeClass.Object);
        browseResult.references[0].typeDefinition.should.eql(makeExpandedNodeId(resolveNodeId("FolderType")));

        browseResult.references[0].referenceTypeId.should.eql(ref_Organizes_Id);
        browseResult.references[1].isForward.should.equal(true);
        browseResult.references[1].browseName.name.should.equal("Types");
        browseResult.references[1].nodeId.toString().should.equal("ns=0;i=86");
        browseResult.references[1].typeDefinition.should.eql(makeExpandedNodeId(resolveNodeId("FolderType")));
        browseResult.references[1].nodeClass.should.eql(NodeClass.Object);

        browseResult.references[0].referenceTypeId.should.eql(ref_Organizes_Id);
        browseResult.references[2].isForward.should.equal(true);
        browseResult.references[2].browseName.name.should.equal("Views");
        browseResult.references[2].nodeId.toString().should.equal("ns=0;i=87");
        browseResult.references[2].typeDefinition.should.eql(makeExpandedNodeId(resolveNodeId("FolderType")));
        browseResult.references[2].nodeClass.should.eql(NodeClass.Object);

    });

    it("should browse a 'Server' object in  the 'Objects' folder", function () {

        var browseDescription = {
            browseDirection: BrowseDirection.Forward,
            nodeClassMask: 0, // 0 = all nodes
            referenceTypeId: "Organizes",
            resultMask: 0x3F
        };
        var browseResult = engine.browseSingleNode("ObjectsFolder", browseDescription);
        browseResult.statusCode.should.eql(StatusCodes.Good);

        browseResult.references.length.should.be.greaterThan(1);
        //xx console.log(browseResult.references[0].browseName.name);

        browseResult.references[0].browseName.name.should.equal("Server");

    });

    it("should handle a BrowseRequest and set StatusCode if node doesn't exist", function () {

        var browseResult = engine.browseSingleNode("ns=46;id=123456");

        browseResult.statusCode.should.equal(StatusCodes.BadNodeIdUnknown);
        browseResult.references.length.should.equal(0);

    });

    it("should handle a BrowseRequest with multiple nodes to browse", function () {

        var browseRequest = new browse_service.BrowseRequest({
            nodesToBrowse: [
                {
                    nodeId: resolveNodeId("RootFolder"),
                    includeSubtypes: true,
                    browseDirection: BrowseDirection.Both,
                    resultMask: 63
                },
                {
                    nodeId: resolveNodeId("ObjectsFolder"),
                    includeSubtypes: true,
                    browseDirection: BrowseDirection.Both,
                    resultMask: 63
                }

            ]
        });

        browseRequest.nodesToBrowse.length.should.equal(2);
        var results = engine.browse(browseRequest.nodesToBrowse);

        results.length.should.equal(2);

        // RootFolder should have 4 nodes ( 1 hasTypeDefinition , 3 sub-folders)
        results[0].references.length.should.equal(4);

    });

    it("should provide results that conforms to browseDescription.resultMask", function () {

        var check_flag = require("lib/misc/utils").check_flag;
        var ResultMask = require("schemas/ResultMask_enum").ResultMask;

        function test_referenceDescription(referenceDescription, resultMask) {
            if (check_flag(resultMask, ResultMask.ReferenceType)) {
                should(referenceDescription.referenceTypeId).be.instanceOf(Object);
            } else {
                should(referenceDescription.referenceTypeId).be.eql(makeNodeId(0, 0));
            }
            if (check_flag(resultMask, ResultMask.BrowseName)) {
                should(referenceDescription.browseName).be.instanceOf(Object);
            } else {
                should(referenceDescription.browseName).be.eql(new QualifiedName({}));
            }
            if (check_flag(resultMask, ResultMask.NodeClass)) {
                should(referenceDescription.nodeClass).be.not.eql(NodeClass.Unspecified);
            } else {
                should(referenceDescription.nodeClass).be.eql(NodeClass.Unspecified);
            }
        }

        function test_result_mask(resultMask) {

            var browseDescription = {
                browseDirection: browse_service.BrowseDirection.Both,
                referenceTypeId: "HierarchicalReferences",
                includeSubtypes: true,
                nodeClassMask: 0, // 0 = all nodes
                resultMask: resultMask
            };
            var browseResult = engine.browseSingleNode("ObjectsFolder", browseDescription);

            browseResult.references.length.should.be.greaterThan(1);
            browseResult.references.forEach(function (referenceDescription) {
                test_referenceDescription(referenceDescription, resultMask.value);
            });

        }

        // ReferenceType
        test_result_mask(ResultMask.BrowseName);
        test_result_mask(ResultMask.NodeClass);
        test_result_mask(ResultMask.NodeClass & ResultMask.BrowseName);


    });

    describe("readSingleNode on Object", function () {

        it("should handle a readSingleNode - BrowseName", function () {

            var readResult = engine.readSingleNode("RootFolder", AttributeIds.BrowseName);

            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.dataType.should.eql(DataType.QualifiedName);
            readResult.value.value.name.should.equal("Root");
        });

        it("should handle a readSingleNode - NodeClass", function () {

            var readResult = engine.readSingleNode("RootFolder", AttributeIds.NodeClass);

            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.dataType.should.eql(DataType.Int32);
            readResult.value.value.should.equal(NodeClass.Object.value);
        });

        it("should handle a readSingleNode - NodeId", function () {

            var readResult = engine.readSingleNode("RootFolder", AttributeIds.NodeId);

            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.dataType.should.eql(DataType.NodeId);
            readResult.value.value.toString().should.equal("ns=0;i=84");
        });

        it("should handle a readSingleNode - DisplayName", function () {

            var readResult = engine.readSingleNode("RootFolder", AttributeIds.DisplayName);

            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.dataType.should.eql(DataType.LocalizedText);
            readResult.value.value.text.toString().should.equal("Root");
        });

        it("should handle a readSingleNode - Description", function () {

            var readResult = engine.readSingleNode("RootFolder", AttributeIds.Description);
            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.dataType.should.eql(DataType.LocalizedText);
            readResult.value.value.text.toString().should.equal("The root of the server address space.");
        });

        it("should handle a readSingleNode - WriteMask", function () {

            var readResult = engine.readSingleNode("RootFolder", AttributeIds.WriteMask);
            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.dataType.should.eql(DataType.UInt32);
            readResult.value.value.should.equal(0);
        });

        it("should handle a readSingleNode - UserWriteMask", function () {

            var readResult = engine.readSingleNode("RootFolder", AttributeIds.UserWriteMask);
            readResult.value.dataType.should.eql(DataType.UInt32);
            readResult.value.value.should.equal(0);
        });
        it("should handle a readSingleNode - EventNotifier", function () {

            var readResult = engine.readSingleNode("RootFolder", AttributeIds.EventNotifier);
            readResult.value.dataType.should.eql(DataType.Byte);
            readResult.value.value.should.equal(0);
        });

        it("should return BadAttributeIdInvalid  - readSingleNode - for bad attribute    ", function () {

            var readResult = engine.readSingleNode("RootFolder", AttributeIds.ContainsNoLoops);
            readResult.statusCode.should.eql(StatusCodes.BadAttributeIdInvalid);
            assert(readResult.value === null);
        });
    });

    describe("readSingleNode on ReferenceType", function () {

        var ref_Organizes_nodeId;
        beforeEach(function () {
            ref_Organizes_nodeId = engine.address_space.findReferenceType("Organizes").nodeId;
        });

        //  --- on reference Type ....
        it("should handle a readSingleNode - IsAbstract", function () {

            var readResult = engine.readSingleNode(ref_Organizes_nodeId, AttributeIds.IsAbstract);
            readResult.value.dataType.should.eql(DataType.Boolean);
            readResult.value.value.should.equal(false);
            readResult.statusCode.should.eql(StatusCodes.Good);
        });

        it("should handle a readSingleNode - Symmetric", function () {

            var readResult = engine.readSingleNode(ref_Organizes_nodeId, AttributeIds.Symmetric);
            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.dataType.should.eql(DataType.Boolean);
            readResult.value.value.should.equal(false);
        });

        it("should handle a readSingleNode - InverseName", function () {

            var readResult = engine.readSingleNode(ref_Organizes_nodeId, AttributeIds.InverseName);
            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.dataType.should.eql(DataType.LocalizedText);
            //xx readResult.value.value.should.equal(false);
        });

        it("should handle a readSingleNode - BrowseName", function () {

            var readResult = engine.readSingleNode(ref_Organizes_nodeId, AttributeIds.BrowseName);
            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.dataType.should.eql(DataType.QualifiedName);
            readResult.value.value.name.should.eql("Organizes");
            //xx readResult.value.value.should.equal(false);
        });
        it("should return BadAttributeIdInvalid on EventNotifier", function () {

            var readResult = engine.readSingleNode(ref_Organizes_nodeId, AttributeIds.EventNotifier);
            readResult.statusCode.should.eql(StatusCodes.BadAttributeIdInvalid);
            assert(readResult.value === null);
        });
    });

    describe("readSingleNode on VariableType", function () {
        //
        it("should handle a readSingleNode - BrowseName", function () {

            var readResult = engine.readSingleNode("DataTypeDescriptionType", AttributeIds.BrowseName);
            readResult.statusCode.should.eql(StatusCodes.Good);
        });
        it("should handle a readSingleNode - IsAbstract", function () {

            var readResult = engine.readSingleNode("DataTypeDescriptionType", AttributeIds.IsAbstract);

            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.dataType.should.eql(DataType.Boolean);
            readResult.value.value.should.equal(false);
        });
        it("should handle a readSingleNode - Value", function () {

            var readResult = engine.readSingleNode("DataTypeDescriptionType", AttributeIds.Value);
            readResult.statusCode.should.eql(StatusCodes.BadAttributeIdInvalid);
        });

        it("should handle a readSingleNode - DataType", function () {

            var readResult = engine.readSingleNode("DataTypeDescriptionType", AttributeIds.DataType);
            readResult.statusCode.should.eql(StatusCodes.Good);
        });
        it("should handle a readSingleNode - ValueRank", function () {

            var readResult = engine.readSingleNode("DataTypeDescriptionType", AttributeIds.ValueRank);
            readResult.statusCode.should.eql(StatusCodes.Good);
        });
        it("should handle a readSingleNode - ArrayDimensions", function () {

            var readResult = engine.readSingleNode("DataTypeDescriptionType", AttributeIds.ArrayDimensions);
            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.arrayType.should.eql(VariantArrayType.Array);
        });
    });

    describe("readSingleNode on Variable (ProductUri)", function () {
        var productUri_id = makeNodeId(2262, 0);
        it("should handle a readSingleNode - BrowseName", function () {

            var readResult = engine.readSingleNode(productUri_id, AttributeIds.BrowseName);
            readResult.statusCode.should.eql(StatusCodes.Good);
        });
        it("should handle a readSingleNode - ArrayDimensions", function () {

            var readResult = engine.readSingleNode(productUri_id, AttributeIds.ArrayDimensions);
            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.arrayType.should.eql(VariantArrayType.Array);
        });
        it("should handle a readSingleNode - AccessLevel", function () {

            var readResult = engine.readSingleNode(productUri_id, AttributeIds.AccessLevel);
            readResult.statusCode.should.eql(StatusCodes.Good);
        });
        it("should handle a readSingleNode - UserAccessLevel", function () {

            var readResult = engine.readSingleNode(productUri_id, AttributeIds.UserAccessLevel);
            readResult.statusCode.should.eql(StatusCodes.Good);
        });
        it("should handle a readSingleNode - MinimumSamplingInterval", function () {

            var readResult = engine.readSingleNode(productUri_id, AttributeIds.MinimumSamplingInterval);
            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.value.should.eql(1000);
        });
        it("should handle a readSingleNode - Historizing", function () {

            var readResult = engine.readSingleNode(productUri_id, AttributeIds.Historizing);
            readResult.statusCode.should.eql(StatusCodes.Good);
            readResult.value.value.should.eql(false);
        });
    });

    describe("readSingleNode on View", function () {

        // for views
        xit("should handle a readSingleNode - ContainsNoLoops", function () {

            var readResult = engine.readSingleNode("RootFolder", AttributeIds.ContainsNoLoops);
            readResult.value.dataType.should.eql(DataType.Boolean);
            readResult.value.value.should.equal(true);
        });
    });

    describe("readSingleNode on DataType", function () {
        // for views
        it("should have ServerStatusDataType dataType exposed", function () {
            var obj = engine.address_space.findDataType("ServerStatusDataType");
            obj.browseName.toString().should.eql("ServerStatusDataType");
            obj.nodeClass.should.eql(NodeClass.DataType);
        });
        it("should handle a readSingleNode - ServerStatusDataType - BrowseName", function () {

            var obj = engine.address_space.findDataType("ServerStatusDataType");
            var serverStatusDataType_id = obj.nodeId;
            var readResult = engine.readSingleNode(serverStatusDataType_id, AttributeIds.BrowseName);
            readResult.value.dataType.should.eql(DataType.QualifiedName);
            readResult.value.value.name.should.equal("ServerStatusDataType");
        });

        it("should handle a readSingleNode - ServerStatusDataType - Description", function () {

            var obj = engine.address_space.findDataType("ServerStatusDataType");
            var serverStatusDataType_id = obj.nodeId;
            var readResult = engine.readSingleNode(serverStatusDataType_id, AttributeIds.Description);
            readResult.value.dataType.should.eql(DataType.LocalizedText);

        });
    });

    it("should return BadNodeIdUnknown  - readSingleNode - with unknown object", function () {

        var readResult = engine.readSingleNode("**UNKNOWN**", AttributeIds.DisplayName);
        readResult.statusCode.should.eql(StatusCodes.BadNodeIdUnknown);
    });

    it("should read the display name of RootFolder", function () {

        var readRequest = new read_service.ReadRequest({
            maxAge: 0,
            timestampsToReturn: TimestampsToReturn.Both,
            nodesToRead: [
                {
                    nodeId: resolveNodeId("RootFolder"),
                    attributeId: AttributeIds.DisplayName,
                    indexRange: null, /* ???? */
                    dataEncoding: null /* */
                }
            ]
        });
        var dataValues = engine.read(readRequest);
        dataValues.length.should.equal(1);

    });

    describe("testing read with indexRange for attributes that can't be used with IndexRange ", function () {
        // see CTT Attribute Service, AttributeRead , Test-Case / Err015.js
        // Read a single node specifying an IndexRange for attributes that can't be used
        // with IndexRange, as in:
        // AccessLevel, BrowseName, DataType, DisplayName, Historizing, NodeClass, NodeId, UserAccessLevel, ValueRank
        // Expect BadIndexRangeNoData

        var nodeId = "ns=1;s=TestVar";
        before(function () {
            engine.addVariable(
                engine.findObject("ObjectsFolder"),
                {
                    browseName: "TestVar",
                    nodeId: nodeId,
                    dataType: "Double",
                    value: {
                        get: function () {
                            return new Variant({
                                dataType: DataType.Double,
                                value: 0
                            });
                        },
                        set: null // read only
                    }
                }
            );
        });

        function read_shall_get_BadIndexRangeNoData(attributeId, done) {
            assert(attributeId >= 0 && attributeId < 22);
            var readRequest = new read_service.ReadRequest({
                maxAge: 0,
                timestampsToReturn: TimestampsToReturn.Both,
                nodesToRead: [
                    {
                        nodeId: nodeId,
                        attributeId: attributeId,
                        indexRange: "1:2",
                        dataEncoding: null /* */
                    }
                ]
            });
            var dataValues = engine.read(readRequest);
            dataValues.length.should.eql(1);
            dataValues[0].statusCode.should.eql(StatusCodes.BadIndexRangeNoData);
            done();
        }

        var attributes = ["AccessLevel", "BrowseName", "DataType", "DisplayName", "Historizing", "NodeClass", "NodeId", "UserAccessLevel", "ValueRank"];
        attributes.forEach(function (attribute) {

            it("shall return BadIndexRangeNoData when performing a read with a  indexRange and attributeId = " + attribute + " ", function (done) {
                read_shall_get_BadIndexRangeNoData(AttributeIds[attribute], done);
            });

        });

        it("should return ", function () {
            var readRequest = new read_service.ReadRequest({
                maxAge: 0,
                timestampsToReturn: TimestampsToReturn.Both,
                nodesToRead: [
                    {
                        nodeId: nodeId,
                        attributeId: AttributeIds.Value,
                        indexRange: null,
                        dataEncoding: {name: "Invalid Data Encoding"} // QualifiedName
                    }
                ]
            });
            var dataValues = engine.read(readRequest);
            dataValues.length.should.eql(1);
            dataValues[0].statusCode.should.eql(StatusCodes.BadDataEncodingInvalid);
        });
    });

    describe("testing read operation with timestamps", function () {

        var nodesToRead =
            [
                {
                    nodeId: resolveNodeId("RootFolder"),
                    attributeId: AttributeIds.DisplayName,
                    indexRange: null, /* ???? */
                    dataEncoding: null /* */
                },
                {
                    nodeId: resolveNodeId("RootFolder"),
                    attributeId: AttributeIds.BrowseName,
                    indexRange: null, /* ???? */
                    dataEncoding: null /* */
                },
                {
                    nodeId: resolveNodeId("ns=0;i=2259"),
                    attributeId: AttributeIds.Value,
                    indexRange: null, /* ???? */
                    dataEncoding: null /* */
                }
            ];
        it("should read and set the required timestamps : TimestampsToReturn.Neither", function (done) {

            var DataValue = require("lib/datamodel/datavalue").DataValue;
            var readRequest = new read_service.ReadRequest({
                maxAge: 0,
                timestampsToReturn: TimestampsToReturn.Neither,
                nodesToRead: nodesToRead
            });

            engine.refreshValues(readRequest.nodesToRead, function (err) {
                if (!err) {

                    var dataValues = engine.read(readRequest);
                    dataValues.length.should.equal(3);

                    dataValues[0].should.be.instanceOf(DataValue);
                    dataValues[0].statusCode.should.eql(StatusCodes.Good);
                    should(dataValues[0].serverTimestamp).eql(null);
                    should(dataValues[0].sourceTimestamp).eql(null);
                    should(dataValues[0].serverPicoseconds).eql(0);
                    should(dataValues[0].sourcePicoseconds).eql(0);

                    dataValues[1].should.be.instanceOf(DataValue);
                    dataValues[1].statusCode.should.eql(StatusCodes.Good);
                    should(dataValues[1].serverTimestamp).eql(null);
                    should(dataValues[1].sourceTimestamp).eql(null);
                    should(dataValues[1].serverPicoseconds).eql(0);
                    should(dataValues[1].sourcePicoseconds).eql(0);

                    dataValues[2].should.be.instanceOf(DataValue);
                    dataValues[2].statusCode.should.eql(StatusCodes.Good);
                    should(dataValues[2].serverTimestamp).eql(null);
                    should(dataValues[2].sourceTimestamp).eql(null);
                    should(dataValues[2].serverPicoseconds).eql(0);
                    should(dataValues[2].sourcePicoseconds).eql(0);
                }
                done(err);
            });

        });

        it("should read and set the required timestamps : TimestampsToReturn.Server", function () {

            var DataValue = require("lib/datamodel/datavalue").DataValue;
            var readRequest = new read_service.ReadRequest({
                maxAge: 0,
                timestampsToReturn: TimestampsToReturn.Server,
                nodesToRead: nodesToRead
            });
            var dataValues = engine.read(readRequest);

            dataValues.length.should.equal(3);
            dataValues[0].should.be.instanceOf(DataValue);
            dataValues[1].should.be.instanceOf(DataValue);
            dataValues[2].should.be.instanceOf(DataValue);

            should(dataValues[0].serverTimestamp).be.instanceOf(Date);
            should(dataValues[0].sourceTimestamp).be.eql(null);
            should(dataValues[0].serverPicoseconds).be.eql(0);
            should(dataValues[0].sourcePicoseconds).be.eql(0);

            should(dataValues[1].serverTimestamp).be.instanceOf(Date);
            should(dataValues[1].sourceTimestamp).be.eql(null);
            should(dataValues[1].serverPicoseconds).be.eql(0);
            should(dataValues[1].sourcePicoseconds).be.eql(0);

            should(dataValues[2].serverTimestamp).be.instanceOf(Date);
            should(dataValues[2].sourceTimestamp).be.eql(null);
            should(dataValues[2].serverPicoseconds).be.eql(0);
            should(dataValues[2].sourcePicoseconds).be.eql(0);

        });

        it("should read and set the required timestamps : TimestampsToReturn.Source", function () {

            var DataValue = require("lib/datamodel/datavalue").DataValue;
            var readRequest = new read_service.ReadRequest({
                maxAge: 0,
                timestampsToReturn: TimestampsToReturn.Source,
                nodesToRead: nodesToRead
            });

            var dataValues = engine.read(readRequest);

            dataValues.length.should.equal(3);
            dataValues[0].should.be.instanceOf(DataValue);
            dataValues[1].should.be.instanceOf(DataValue);
            dataValues[2].should.be.instanceOf(DataValue);

            should(dataValues[0].serverTimestamp).be.eql(null);
            should(dataValues[0].sourceTimestamp).be.eql(null); /// SourceTimestamp only for AttributeIds.Value
            should(dataValues[0].serverPicoseconds).be.eql(0);
            should(dataValues[0].sourcePicoseconds).be.eql(0);

            should(dataValues[1].serverTimestamp).be.eql(null);
            should(dataValues[1].sourceTimestamp).be.eql(null); /// SourceTimestamp only for AttributeIds.Value
            should(dataValues[1].serverPicoseconds).be.eql(0);
            should(dataValues[1].sourcePicoseconds).be.eql(0);

            should(dataValues[2].sourceTimestamp).be.instanceOf(Date);

        });

        it("should read and set the required timestamps : TimestampsToReturn.Both", function () {

            var DataValue = require("lib/datamodel/datavalue").DataValue;
            var readRequest = new read_service.ReadRequest({
                maxAge: 0,
                timestampsToReturn: TimestampsToReturn.Both,
                nodesToRead: nodesToRead
            });
            var dataValues = engine.read(readRequest);

            dataValues.length.should.equal(3);
            dataValues[0].should.be.instanceOf(DataValue);
            dataValues[1].should.be.instanceOf(DataValue);
            dataValues[2].should.be.instanceOf(DataValue);

            should(dataValues[0].serverTimestamp).be.instanceOf(Date);
            should(dataValues[0].sourceTimestamp).be.eql(null); /// SourceTimestamp only for AttributeIds.Value
            should(dataValues[0].serverPicoseconds).be.eql(0);
            should(dataValues[0].sourcePicoseconds).be.eql(0);

            should(dataValues[1].serverTimestamp).be.instanceOf(Date);
            should(dataValues[1].sourceTimestamp).be.eql(null); /// SourceTimestamp only for AttributeIds.Value
            should(dataValues[1].serverPicoseconds).be.eql(0);
            should(dataValues[1].sourcePicoseconds).be.eql(0);

            should(dataValues[2].sourceTimestamp).be.instanceOf(Date);

        });

    });

    it("should read Server_NamespaceArray ", function (done) {

        var readRequest = new read_service.ReadRequest({
            maxAge: 0,
            timestampsToReturn: TimestampsToReturn.Both,
            nodesToRead: [
                {
                    nodeId: server_NamespaceArray_Id,
                    attributeId: AttributeIds.DisplayName,
                    indexRange: null, /* ???? */
                    dataEncoding: null /* */
                },
                {
                    nodeId: server_NamespaceArray_Id,
                    attributeId: AttributeIds.Value,
                    indexRange: null, /* ???? */
                    dataEncoding: null /* */
                }
            ]
        });

        engine.refreshValues(readRequest.nodesToRead, function (err) {
            if (!err) {
                var dataValues = engine.read(readRequest);
                dataValues.length.should.equal(2);
                dataValues[0].value.value.text.should.eql("NamespaceArray");
                dataValues[1].value.value.should.be.instanceOf(Array);
                dataValues[1].value.value.length.should.be.eql(2);
            }
            done(err);
        });
    });

    it("should handle indexRange with individual value", function (done) {

        var readRequest = new read_service.ReadRequest({
            maxAge: 0,
            timestampsToReturn: TimestampsToReturn.Both,
            nodesToRead: [
                {
                    nodeId: "ns=1;s=TestArray",
                    attributeId: AttributeIds.Value,
                    indexRange: "2",     // <<<<<<<<<<<<<<<<<<<<<<<<<<
                    dataEncoding: null /* */
                }
            ]
        });
        engine.refreshValues(readRequest.nodesToRead, function (err) {
            if (!err) {
                var dataValues = engine.read(readRequest);
                dataValues.length.should.equal(1);
                dataValues[0].statusCode.should.eql(StatusCodes.Good);

                dataValues[0].value.value.should.be.instanceOf(Float64Array);
                dataValues[0].value.value.length.should.be.eql(1);
                dataValues[0].value.value[0].should.be.eql(2.0);
            }
            done(err);
        });
    });

    it("should handle indexRange with a simple range", function (done) {

        var readRequest = new read_service.ReadRequest({
            maxAge: 0,
            timestampsToReturn: TimestampsToReturn.Both,
            nodesToRead: [
                {
                    nodeId: "ns=1;s=TestArray",
                    attributeId: AttributeIds.Value,
                    indexRange: "2:5",    // <<<<<<<<<<<<<<<<<<<<<<<<<<
                    dataEncoding: null /* */
                }
            ]
        });
        engine.refreshValues(readRequest.nodesToRead, function (err) {
            if (!err) {
                var dataValues = engine.read(readRequest);
                dataValues.length.should.equal(1);
                dataValues[0].statusCode.should.eql(StatusCodes.Good);
                dataValues[0].value.value.should.be.instanceOf(Float64Array);
                dataValues[0].value.value.length.should.be.eql(4);
                assert_arrays_are_equal(dataValues[0].value.value, new Float64Array([2.0, 3.0, 4.0, 5.0]));
            }
            done(err);
        });

    });

    it("should receive BadIndexRangeNoData when indexRange try to access outside boundary", function (done) {

        var readRequest = new read_service.ReadRequest({
            maxAge: 0,
            timestampsToReturn: TimestampsToReturn.Both,
            nodesToRead: [
                {
                    nodeId: "ns=1;s=TestArray",
                    attributeId: AttributeIds.Value,
                    indexRange: "2:1000",    // <<<<<<<<<<<<<<<<<<<<<<<<<< BAD BOUNDARY !!!
                    dataEncoding: null /* */
                }
            ]
        });
        engine.refreshValues(readRequest.nodesToRead, function (err) {
            if (!err) {
                var dataValues = engine.read(readRequest);
                dataValues.length.should.equal(1);
                dataValues[0].statusCode.should.eql(StatusCodes.BadIndexRangeNoData);
            }
            done(err);
        });

    });

    it("should read Server_NamespaceArray  DataType", function () {
        var readRequest = new read_service.ReadRequest({
            maxAge: 0,
            timestampsToReturn: TimestampsToReturn.Both,
            nodesToRead: [
                {
                    nodeId: server_NamespaceArray_Id,
                    attributeId: AttributeIds.DataType,
                    indexRange: null, /* ???? */
                    dataEncoding: null /* */
                }
            ]
        });
        var dataValues = engine.read(readRequest);
        dataValues.length.should.equal(1);
        dataValues[0].value.dataType.should.eql(DataType.NodeId);
        dataValues[0].value.value.toString().should.eql("ns=0;i=12"); // String
    });

    it("should read Server_NamespaceArray ValueRank", function () {

        var readRequest = new read_service.ReadRequest({
            maxAge: 0,
            timestampsToReturn: TimestampsToReturn.Both,
            nodesToRead: [
                {
                    nodeId: server_NamespaceArray_Id,
                    attributeId: AttributeIds.ValueRank,
                    indexRange: null, /* ???? */
                    dataEncoding: null /* */
                }
            ]
        });

        var dataValues = engine.read(readRequest);
        dataValues.length.should.equal(1);
        dataValues[0].statusCode.should.eql(StatusCodes.Good);

        //xx console.log("xxxxxxxxx =  dataValues[0].value.value",typeof( dataValues[0].value.value), dataValues[0].value.value);
        dataValues[0].value.value.should.eql(VariantArrayType.Array.value);

    });

    describe("testing ServerEngine browsePath", function () {
        var translate_service = require("lib/services/translate_browse_paths_to_node_ids_service");
        var nodeid = require("lib/datamodel/nodeid");

        it("translating a browse path to a nodeId with a invalid starting node shall return BadNodeIdUnknown", function () {
            var browsePath = new translate_service.BrowsePath({
                startingNode: nodeid.makeNodeId(0), // <=== invalid node id
                relativePath: []
            });

            var browsePathResult = engine.browsePath(browsePath);
            browsePathResult.should.be.instanceOf(translate_service.BrowsePathResult);

            browsePathResult.statusCode.should.eql(StatusCodes.BadNodeIdUnknown);
        });
        it("translating a browse path to a nodeId with an empty relativePath  shall return BadNothingToDo", function () {
            var browsePath = new translate_service.BrowsePath({
                startingNode: nodeid.makeNodeId(84), // <=== valid node id
                relativePath: {elements: []}         // <=== empty path
            });

            var browsePathResult = engine.browsePath(browsePath);
            browsePathResult.should.be.instanceOf(translate_service.BrowsePathResult);

            browsePathResult.statusCode.should.eql(StatusCodes.BadNothingToDo);
        });

        it("The Server shall return BadBrowseNameInvalid if the targetName is missing. ", function () {
            var browsePath = new translate_service.BrowsePath({
                startingNode: nodeid.makeNodeId(84),
                relativePath: {
                    elements: [
                        {
                            //xx referenceTypeId: null,
                            isInverse: false,
                            includeSubtypes: 0,
                            targetName: null // { namespaceIndex:0 , name: "Server"}
                        }
                    ]
                }
            });

            var browsePathResult = engine.browsePath(browsePath);
            browsePathResult.should.be.instanceOf(translate_service.BrowsePathResult);

            browsePathResult.statusCode.should.eql(StatusCodes.BadBrowseNameInvalid);
            browsePathResult.targets.length.should.eql(0);
        });
        it("The Server shall return BadNoMatch if the targetName doesn't exist. ", function () {
            var browsePath = new translate_service.BrowsePath({
                startingNode: nodeid.makeNodeId(84),
                relativePath: {
                    elements: [
                        {
                            //xx referenceTypeId: null,
                            isInverse: false,
                            includeSubtypes: 0,
                            targetName: {namespaceIndex: 0, name: "xxxx invalid name xxx"}
                        }
                    ]
                }
            });

            var browsePathResult = engine.browsePath(browsePath);
            browsePathResult.should.be.instanceOf(translate_service.BrowsePathResult);
            browsePathResult.statusCode.should.eql(StatusCodes.BadNoMatch);
            browsePathResult.targets.length.should.eql(0);
        });

        it("The Server shall return Good if the targetName does exist. ", function () {

            var browsePath = new translate_service.BrowsePath({
                startingNode: nodeid.makeNodeId(84),
                relativePath: {
                    elements: [
                        {
                            //xx referenceTypeId: null,
                            isInverse: false,
                            includeSubtypes: 0,
                            targetName: {namespaceIndex: 0, name: "Objects"}
                        }
                    ]
                }
            });

            var browsePathResult = engine.browsePath(browsePath);
            browsePathResult.should.be.instanceOf(translate_service.BrowsePathResult);
            browsePathResult.statusCode.should.eql(StatusCodes.Good);
            browsePathResult.targets.length.should.eql(1);
            browsePathResult.targets[0].targetId.should.eql(makeExpandedNodeId(85));
            var UInt32_MaxValue = 0xFFFFFFFF;
            browsePathResult.targets[0].remainingPathIndex.should.equal(UInt32_MaxValue);
        });

    });

    describe("Accessing ServerStatus nodes", function () {

        it("should read  Server_ServerStatus_CurrentTime", function (done) {

            var readRequest = new read_service.ReadRequest({
                timestampsToReturn: read_service.TimestampsToReturn.Neither,
                nodesToRead: [{
                    nodeId: VariableIds.Server_ServerStatus_CurrentTime,
                    attributeId: AttributeIds.Value
                }]
            });
            engine.refreshValues(readRequest.nodesToRead, function (err) {
                if (!err) {
                    var dataValues = engine.read(readRequest);
                    dataValues.length.should.equal(1);
                    dataValues[0].statusCode.should.eql(StatusCodes.Good);
                    dataValues[0].value.dataType.should.eql(DataType.DateTime);
                    dataValues[0].value.value.should.be.instanceOf(Date);
                }
                done(err);
            });

        });

        it("should read  Server_ServerStatus_StartTime", function (done) {

            var readRequest = new read_service.ReadRequest({
                timestampsToReturn: read_service.TimestampsToReturn.Neither,
                nodesToRead: [{
                    nodeId: VariableIds.Server_ServerStatus_StartTime,
                    attributeId: AttributeIds.Value
                }]
            });
            engine.refreshValues(readRequest.nodesToRead, function (err) {
                if (!err) {
                    var dataValues = engine.read(readRequest);
                    dataValues.length.should.equal(1);
                    dataValues[0].statusCode.should.eql(StatusCodes.Good);
                    dataValues[0].value.dataType.should.eql(DataType.DateTime);
                    dataValues[0].value.value.should.be.instanceOf(Date);
                }
                done(err);
            });

        });

        it("should read  Server_ServerStatus_BuildInfo_BuildNumber", function (done) {

            engine.buildInfo.buildNumber = "1234";

            var readRequest = new read_service.ReadRequest({
                timestampsToReturn: read_service.TimestampsToReturn.Neither,
                nodesToRead: [{
                    nodeId: VariableIds.Server_ServerStatus_BuildInfo_BuildNumber,
                    attributeId: AttributeIds.Value
                }]
            });
            engine.refreshValues(readRequest.nodesToRead, function (err) {
                if (!err) {
                    var dataValues = engine.read(readRequest);
                    dataValues.length.should.equal(1);
                    dataValues[0].statusCode.should.eql(StatusCodes.Good);
                    dataValues[0].value.dataType.should.eql(DataType.String);
                    dataValues[0].value.value.should.eql("1234");
                }
                done(err);
            });
        });

        it("should read  Server_ServerStatus_BuildInfo_BuildNumber (2nd)", function () {

            engine.buildInfo.buildNumber = "1234";

            var nodeid = VariableIds.Server_ServerStatus_BuildInfo_BuildNumber;
            var node = engine.findObject(nodeid);
            should(node).not.equal(null);

            var dataValue = node.readAttribute(13);

            dataValue.statusCode.should.eql(StatusCodes.Good);
            dataValue.value.dataType.should.eql(DataType.String);
            dataValue.value.value.should.eql("1234");

        });

        it("should read  Server_ServerDiagnostics_ServerDiagnosticsSummary_CurrentSessionCount", function (done) {


            var nodeid = VariableIds.Server_ServerDiagnostics_ServerDiagnosticsSummary_CurrentSessionCount;
            var node = engine.findObject(nodeid);
            assert(node !== null);
            should(node).not.eql(null);

            var nodesToRead = [{
                nodeId: nodeid,
                attributeId: AttributeIds.Value
            }];
            engine.refreshValues(nodesToRead, function (err) {
                if (!err) {
                    var dataValue = node.readAttribute(AttributeIds.Value);
                    dataValue.statusCode.should.eql(StatusCodes.Good);
                    dataValue.value.dataType.should.eql(DataType.UInt32);
                    dataValue.value.value.should.eql(0);
                }
                done(err);
            });

        });

        it("should read all attributes of Server_ServerStatus_CurrentTime", function (done) {

            var readRequest = new read_service.ReadRequest({
                timestampsToReturn: read_service.TimestampsToReturn.Neither,
                nodesToRead: [1, 2, 3, 4, 5, 6, 7, 13, 14, 15, 16, 17, 18, 19, 20].map(function (attributeId) {
                    return {
                        nodeId: VariableIds.Server_ServerStatus_CurrentTime,
                        attributeId: attributeId
                    };
                })
            });
            engine.refreshValues(readRequest.nodesToRead, function (err) {
                if (!err) {
                    var dataValues = engine.read(readRequest);
                    dataValues.length.should.equal(15);
                    dataValues[7].statusCode.should.eql(StatusCodes.Good);
                    dataValues[7].value.dataType.should.eql(DataType.DateTime);
                    dataValues[7].value.value.should.be.instanceOf(Date);
                }
                done(err);
            });

        });
    });

    describe("Accessing ServerStatus as a single composite object", function () {

        it("should be possible to access the ServerStatus Object as a variable", function (done) {

            var readRequest = new read_service.ReadRequest({
                timestampsToReturn: read_service.TimestampsToReturn.Neither,
                nodesToRead: [{
                    nodeId: VariableIds.Server_ServerStatus,
                    attributeId: AttributeIds.Value
                }]
            });
            engine.refreshValues(readRequest.nodesToRead, function (err) {
                if (!err) {
                    var dataValues = engine.read(readRequest);
                    dataValues.length.should.equal(1);
                    dataValues[0].statusCode.should.eql(StatusCodes.Good);
                    dataValues[0].value.dataType.should.eql(DataType.ExtensionObject);

                    dataValues[0].value.value.should.be.instanceOf(Object);

                    var serverStatus = dataValues[0].value.value;

                    serverStatus.state.key.should.eql("Running");
                    serverStatus.state.value.should.eql(0);
                    serverStatus.shutdownReason.text.should.eql("");

                    serverStatus.buildInfo.productName.should.equal("NODEOPCUA-SERVER");
                    serverStatus.buildInfo.softwareVersion.should.equal("1.0");
                    serverStatus.buildInfo.manufacturerName.should.equal("<Manufacturer>");
                    serverStatus.buildInfo.productUri.should.equal("URI:NODEOPCUA-SERVER");
                }
                done(err);
            });
        });
    });


    describe("Accessing BuildInfo as a single composite object", function () {

        it("should be possible to read the Server_ServerStatus_BuildInfo Object as a complex structure", function (done) {

            var readRequest = new read_service.ReadRequest({
                timestampsToReturn: read_service.TimestampsToReturn.Neither,
                nodesToRead: [{
                    nodeId: VariableIds.Server_ServerStatus_BuildInfo,
                    attributeId: AttributeIds.Value
                }]
            });
            engine.refreshValues(readRequest.nodesToRead, function (err) {
                if (!err) {
                    var dataValues = engine.read(readRequest);
                    dataValues.length.should.equal(1);
                    dataValues[0].statusCode.should.eql(StatusCodes.Good);
                    dataValues[0].value.dataType.should.eql(DataType.ExtensionObject);

                    console.log('buildInfo', dataValues[0].value.value);
                    dataValues[0].value.value.should.be.instanceOf(Object);

                    var buildInfo = dataValues[0].value.value;

                    buildInfo.productName.should.equal("NODEOPCUA-SERVER");
                    buildInfo.softwareVersion.should.equal("1.0");
                    buildInfo.manufacturerName.should.equal("<Manufacturer>");
                    buildInfo.productUri.should.equal("URI:NODEOPCUA-SERVER");
                }
                done(err);
            });
        });
    });


    describe("writing nodes ", function () {

        var WriteValue = require("lib/services/write_service").WriteValue;

        it("should write a single node", function (done) {

            var nodeToWrite = new WriteValue({
                nodeId: coerceNodeId("ns=1;s=WriteableInt32"),
                attributeId: AttributeIds.Value,
                indexRange: null,
                value: { // dataValue
                    value: { // variant
                        dataType: DataType.Int32,
                        value: 10
                    }
                }
            });
            engine.writeSingleNode(nodeToWrite, function (err, statusCode) {
                statusCode.should.eql(StatusCodes.Good);
                done(err);
            });
        });

        it("should return BadNotWritable when trying to write a Executable attribute", function (done) {

            var nodeToWrite = new WriteValue({
                nodeId: resolveNodeId("RootFolder"),
                attributeId: AttributeIds.Executable,
                indexRange: null,
                value: { // dataValue
                    value: { // variant
                        dataType: DataType.UInt32,
                        value: 10
                    }
                }
            });
            engine.writeSingleNode(nodeToWrite, function (err, statusCode) {
                statusCode.should.eql(StatusCodes.BadNotWritable);
                done(err);
            });

        });

        it("should write many nodes", function (done) {

            var nodesToWrite = [
                new WriteValue({
                    nodeId: coerceNodeId("ns=1;s=WriteableInt32"),
                    attributeId: AttributeIds.Value,
                    indexRange: null,
                    value: { // dataValue
                        value: { // variant
                            dataType: DataType.Int32,
                            value: 10
                        }
                    }
                }),
                new WriteValue({
                    nodeId: coerceNodeId("ns=1;s=WriteableInt32"),
                    attributeId: AttributeIds.Value,
                    indexRange: null,
                    value: { // dataValue
                        value: { // variant
                            dataType: DataType.Int32,
                            value: 10
                        }
                    }
                })
            ];

            engine.write(nodesToWrite, function (err, results) {
                results.length.should.eql(2);
                results[0].should.eql(StatusCodes.Good);
                results[1].should.eql(StatusCodes.Good);
                done(err);
            });

        });

        it(" write a single node with a null variant shall return BadTypeMismatch", function (done) {

            var nodeToWrite = new WriteValue({
                nodeId: coerceNodeId("ns=1;s=WriteableInt32"),
                attributeId: AttributeIds.Value,
                indexRange: null,
                value: { // dataValue
                    value: null
                }
            });
            engine.writeSingleNode(nodeToWrite, function (err, statusCode) {
                statusCode.should.eql(StatusCodes.BadTypeMismatch);
                done(err);
            });
        });

    });


    describe("testing the ability to handle variable that returns a StatusCode rather than a Variant", function () {

        before(function () {
            // add a variable that fails to provide a Variant.
            // we simulate the scenario where the variable represent a PLC value,
            // and for some reason, the server cannot access the PLC.
            // In this case we expect the value getter to return a StatusCode rather than a Variant
            engine.addVariable(
                engine.findObject("ObjectsFolder"),
                {
                    browseName: "FailingPLCValue",
                    nodeId: "ns=1;s=FailingPLCValue",
                    dataType: "Double",
                    value: {
                        get: function () {
                            // we return a StatusCode here instead of a Variant
                            // this means : "Houston ! we have a problem"
                            return StatusCodes.BadResourceUnavailable;
                        },
                        set: null // read only
                    }
                }
            );
        });
        it("ZZ should have statusCode=BadResourceUnavailable when trying to read the FailingPLCValue variable", function (done) {

            var readRequest = new read_service.ReadRequest({
                timestampsToReturn: read_service.TimestampsToReturn.Neither,
                nodesToRead: [{
                    nodeId: "ns=1;s=FailingPLCValue",
                    attributeId: AttributeIds.Value
                }]
            });
            engine.refreshValues(readRequest.nodesToRead, function (err) {
                if (!err) {
                    var readResults = engine.read(readRequest);
                    readResults[0].statusCode.should.eql(StatusCodes.BadResourceUnavailable);
                }
                done(err);
            });

        });
    });

    describe("ServerEngine : forcing variable value refresh", function () {


        var value1 = 0;
        var value2 = 0;

        before(function () {

            // add a variable that provide a on demand refresh function
            engine.addVariable(
                engine.findObject("ObjectsFolder"),
                {
                    browseName: "RefreshedOnDemandValue",
                    nodeId: "ns=1;s=RefreshedOnDemandValue",
                    dataType: "Double",
                    value: {
                        refreshFunc: function (callback) {
                            // add some delay to simulate a long operation to perform the asynchronous read
                            setTimeout(function () {
                                value1 += 1;
                                var dataValue = new DataValue({
                                    value: {
                                        dataType: DataType.Double,
                                        value: value1
                                    }
                                });
                                callback(null, dataValue);
                            }, 10);
                        }
                    }
                }
            );
            // add an other variable that provide a on demand refresh function
            engine.addVariable(
                engine.findObject("ObjectsFolder"),
                {
                    browseName: "OtherRefreshedOnDemandValue",
                    nodeId: "ns=1;s=OtherRefreshedOnDemandValue",
                    dataType: "Double",
                    value: {
                        refreshFunc: function (callback) {
                            setTimeout(function () {
                                value2 += 1;
                                var dataValue = new DataValue({
                                    value: {dataType: DataType.Double, value: value2}
                                });
                                callback(null, dataValue);
                            }, 10);
                        }
                    }
                }
            );
        });


        beforeEach(function () {
            // reset counters;
            value1 = 0;
            value2 = 0;

        });


        it("should refresh a single variable value asynchronously", function (done) {

            var nodesToRefresh = [{nodeId: "ns=1;s=RefreshedOnDemandValue"}];

            var v = engine.readSingleNode(nodesToRefresh[0].nodeId, AttributeIds.Value);
            v.statusCode.should.equal(StatusCodes.UncertainInitialValue);

            engine.refreshValues(nodesToRefresh, function (err, values) {

                if (!err) {
                    values[0].value.value.should.equal(1);

                    value1.should.equal(1);
                    value2.should.equal(0);

                    var dataValue = engine.readSingleNode(nodesToRefresh[0].nodeId, AttributeIds.Value);
                    dataValue.statusCode.should.eql(StatusCodes.Good);
                    dataValue.value.value.should.eql(1);

                }
                done(err);
            });
        });

        it("should refresh multiple variable values asynchronously", function (done) {


            var nodesToRefresh = [
                {nodeId: "ns=1;s=RefreshedOnDemandValue"},
                {nodeId: "ns=1;s=OtherRefreshedOnDemandValue"}
            ];

            engine.refreshValues(nodesToRefresh, function (err, values) {
                if (!err) {
                    values.length.should.equal(2, " expecting two node asynchronous refresh call");

                    values[0].value.value.should.equal(1);
                    values[1].value.value.should.equal(1);

                    value1.should.equal(1);
                    value2.should.equal(1);
                }
                done(err);
            });
        });

        it("should  refresh nodes only once if they are duplicated ", function (done) {

            var nodesToRefresh = [
                {nodeId: "ns=1;s=RefreshedOnDemandValue"},
                {nodeId: "ns=1;s=RefreshedOnDemandValue"}, // <== duplicated node
                {nodeId: "ns=1;s=RefreshedOnDemandValue", attributeId: AttributeIds.DisplayName}
            ];
            engine.refreshValues(nodesToRefresh, function (err, values) {

                if (!err) {
                    values.length.should.equal(1, " expecting only one node asynchronous refresh call");

                    value1.should.equal(1);
                    value2.should.equal(0);
                }

                done(err);
            });
        });

        it("should ignore nodes with attributeId!=AttributeIds.Value ", function (done) {

            var nodesToRefresh = [
                {nodeId: "ns=1;s=RefreshedOnDemandValue", attributeId: AttributeIds.DisplayName}
            ];
            engine.refreshValues(nodesToRefresh, function (err, values) {
                if (!err) {
                    values.length.should.equal(0, " expecting no asynchronous refresh call");
                    value1.should.equal(0);
                    value2.should.equal(0);
                }
                done(err);
            });
        });

        it("should perform readValueAsync on Variable", function (done) {


            var variable = engine.findObject("ns=1;s=RefreshedOnDemandValue");

            value1.should.equal(0);
            variable.readValueAsync(function (err, value) {
                value1.should.equal(1);

                done(err);
            });

        });
    });


});


describe("ServerEngine advanced", function () {

    before(function (done) {
        resourceLeakDetector.start();
        done();
    });
    after(function () {
        resourceLeakDetector.stop();
    });

    it("ServerEngine#registerShutdownTask should execute shutdown tasks on shutdown", function (done) {

        var engine = new ServerEngine();

        var sinon = require("sinon");
        var myFunc = sinon.spy();

        engine.registerShutdownTask(myFunc);

        engine.shutdown();

        myFunc.calledOnce.should.eql(true);

        done();
    });

    it("ServerEngine#shutdown engine should take care of disposing session on shutdown", function (done) {

        var engine = new ServerEngine();
        var session1 = engine.createSession();
        var session2 = engine.createSession();
        var session3 = engine.createSession();

        engine.shutdown();
        // leaks will be detected if engine failed to dispose session
        done();
    });

});
