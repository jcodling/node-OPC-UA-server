"use strict";

require("requirish")._(module);

var assert = require("assert");
//var opcua = require("lib/../");
var AddressSpace = require("lib/address_space/address_space").AddressSpace;
var UADataType = require("lib/address_space/ua_data_type").UADataType;

var path = require("path");
var normalize_require_file = require("lib/misc/utils").normalize_require_file;
var _ = require("underscore");
var resolveNodeId = require("lib/datamodel/nodeid").resolveNodeId;

var LineFile = require("lib/misc/linefile").LineFile;


/**
 * returns the location of the  javascript version of the schema  corresponding to schemaName
 * @method getSchemaSourceFile
 * @param schemaName {string}
 * @param schema_type {string}  "enum" | "schema"
 * @return {string}
 * @private
 */
function getSchemaSourceFile(schemaName, schema_type) {

    if (!(schema_type === "enum" || schema_type === "schema" || schema_type === "")) {
        throw new Error(" unexpected schema_type" + schema_type);
    }

    var folder = path.normalize(path.join(__dirname, "/../../schemas"));

    if (schema_type === "") {
        return path.join(folder, schemaName + ".js");
    } else {
        return path.join(folder, schemaName + "_" + schema_type + ".js");
    }
}


/**
 * convert a nodeset enumeration into a javascript script enumeration code
 * @method generateEnumerationCode
 * @param dataType
 * @param filename {string} the output filename
 *
 */
function generateEnumerationCode(dataType, filename) {

    // create the enumeration file
    var f = new LineFile();
    f.write("require(\"requirish\")._(module);");
    f.write("var factories  = require(\"lib/misc/factories\");");
    f.write("var makeNodeId = require(\"lib/datamodel/nodeid\").makeNodeId;");

    var dataTypeName = dataType.browseName.toString();

    f.write("var " + dataTypeName + "_Schema = {");
    f.write("  id:  makeNodeId(" + dataType.nodeId.value + ",0),");
    f.write("  name: '" + dataTypeName + "',");
    f.write("  enumValues: {");
    dataType.definition.forEach(function (pair) {
        f.write("     " + pair.name + ": " + pair.value + ",");
    });
    f.write("  }");
    f.write("};");
    f.write("exports." + dataTypeName + "_Schema = " + dataTypeName + "_Schema;");
    f.write("exports." + dataTypeName + " = factories.registerEnumeration(" + dataTypeName + "_Schema);");
    f.save(filename);
}

var QualifiedName = require("lib/datamodel/qualified_name").QualifiedName;
/**
 * var dataType = {
 *    browseName: "Color",
 *    definition: [
 *      { name: "Red",  value: 12},
 *      { name: "Blue", value: 11}
 *    ]
 * };
 *
 * makeEnumeration(dataType);
 *
 * @method makeEnumeration
 *
 * @param dataType {Object}
 * @return {*}
 */
function makeEnumeration(dataType) {

    assert(dataType);
    assert(dataType.hasOwnProperty("browseName"));
    assert(dataType.browseName instanceof QualifiedName);
    assert(_.isArray(dataType.definition));

    var Enumeration_Schema = {
        id: dataType.nodeId,
        name: dataType.browseName.toString(),
        enumValues: {}
    };

    dataType.definition.forEach(function (pair) {
        Enumeration_Schema.enumValues[pair.name] = parseInt(pair.value, 10);
    });

    var filename = getSchemaSourceFile(dataType.browseName.toString(), "enum");

    generateEnumerationCode(dataType, filename);

    var relative_filename = normalize_require_file(__dirname, filename);

    return require(relative_filename)[dataType.browseName.toString()];
}

exports.makeEnumeration = makeEnumeration;


var lowerFirstLetter = require("lib/misc/utils").lowerFirstLetter;


function generateStructureCode(schema) {

    var name = schema.name;

    var f = new LineFile();

    f.write("require(\"requirish\")._(module);");
    f.write("var factories  = require(\"lib/misc/factories\");");
    f.write("var coerceNodeId = require(\"lib/datamodel/nodeid\").coerceNodeId;");
    f.write("var " + schema.name + "_Schema = {");
    f.write("    id:  coerceNodeId(\'" + schema.id.toString() + "\'),");
    f.write("    name: \"" + name + "\",");
    f.write("    fields: [");
    schema.fields.forEach(function (field) {
        f.write("       {");
        f.write("           name: \"" + field.name + "\",");
        f.write("           fieldType: \"" + field.fieldType + "\"");
        if (field.isArray) {
            f.write("         ,   isArray:" + (field.isArray ? "true" : false));
        }
        if (field.documentation) {
            f.write("          , documentation:" + (field.documentation) + " ");
        }
        f.write("       },");
    });
    f.write("        ]");
    f.write("    };");
    f.write("exports." + name + "_Schema = " + name + "_Schema;");
    //xx write("exports."+name+" = factories.registerObject(" + name+"_Schema);");

    var filename = getSchemaSourceFile(name, "schema");
    f.save(filename);

}

function generateFileCode(schema) {

    var f = new LineFile();

    var name = schema.name;
    f.write("require(\"requirish\")._(module);");
    f.write("var  registerObject = require(\"lib/misc/factories\").registerObject;");
    // f.write("registerObject('_generated_schemas|"+ name + "','_generated_schemas');");
    f.write("registerObject('" + name + "');");

    // var filename = "../_generated_schemas/_auto_generated_"+ name;
    var filename = "_generated_/_auto_generated_" + name;
    f.write("var " + name + " = require(\"" + filename + "\")." + name + ";");
    f.write("exports." + name + " = " + name + ";");

    filename = getSchemaSourceFile(name, "");
    f.save(filename);
}

/*= private
 *
 * @example:
 *    var dataType =  {
 *       browseName: "ServerStatusDataType",
 *       definition: [
 *           { name "timeout", dataType: "UInt32" }
 *       ]
 *    };
 * @param dataType {Object}
 * @return {*}
 */
function makeStructure(dataType) {

    var address_space = dataType.__address_space;

    assert(address_space.constructor.name === "AddressSpace");

    var name = dataType.browseName.toString();
    assert(name.substr(-8) === "DataType");

    assert(dataType instanceof UADataType);

    // remove Datatype to get the name of the class
    name = name.substring(0, name.length - 8);
    // console.log(" xxxxxxxxxxxxxxxxxxxxxx ".red.bold,dataType.browseName);
    //xx console.log(" xxxxxxxxxxxxxxxxxxxxxx ".green.bold,dataType.findReferences("HasEncoding",false));
    //xx console.log(" xxxxxxxxxxxxxxxxxxxxxx ".green.bold,dataType.findReferences("HasEncoding",true));
    //xx console.log(" xxxxxxxxxxxxxxxxxxxxxx XML".yellow,dataType.getEncodingNodeId("Default XML").toString());
    //xx console.log(" xxxxxxxxxxxxxxxxxxxxxx Binary".yellow,dataType.getEncodingNodeId("Default Binary").nodeId.toString());
    //console.log(" xxxxxxxxxxxxxxxxxxxxxx Binary".yellow, dataType.binaryEncodingNodeId.toString());


    var schema = {
        id: dataType.binaryEncodingNodeId,
        name: name,
        fields: [
            // { name: "title", fieldType: "UAString" , isArray: false , documentation: "some text"},
        ]
    };

    // construct the fields
    dataType.definition.forEach(function (pair) {

        var dataTypeId = resolveNodeId(pair.dataType);

        var dataType = address_space.findObject(dataTypeId);
        if (!dataType) {
            throw new Error(" cannot find description for object " + dataTypeId +
                ". Check that this node exists in the nodeset.xml file");
        }
        var dataTypeName = dataType.browseName.toString();

        dataTypeName = dataTypeName.replace(/DataType/, "");


        schema.fields.push({
            name: lowerFirstLetter(pair.name),
            fieldType: dataTypeName,
            isArray: false,
            description: "some description here"
        });
    });


    generateFileCode(schema);

    generateStructureCode(schema);

    var filename = getSchemaSourceFile(schema.name, "");

    var relative_filename = normalize_require_file(__dirname, filename);

    //Xxx console.log("xxxxxxxxxxxxxxxxxx => ".green,schema.name,filename.cyan,relative_filename.yellow);

    var constructor = require(relative_filename)[schema.name];
    assert(_.isFunction(constructor), "expecting a constructor here");

    return constructor;
}

exports.makeStructure = makeStructure;


var nodeset = {
    ServerState: null,
    ServerStatus: null,
    ServiceCounter: null,
    SessionDiagnostics: null
};
exports.nodeset = nodeset;

function registerDataTypeEnum(address_space, dataTypeName) {

    var dataType = address_space.findDataType(dataTypeName);
    assert(dataType);
    var superType = address_space.findObject(dataType.subTypeOf);
    assert(superType.browseName.toString() === "Enumeration");
    return makeEnumeration(dataType);
}
function registerDataType(address_space, dataTypeName) {

    console.log("dataTypeName = ", dataTypeName);
    var dataType = address_space.findDataType(dataTypeName + "DataType");
    assert(dataType);
    var superType = address_space.findObject(dataType.subTypeOf);
    assert(superType.browseName.toString() === "Structure");

    // finding object with encoding
    //
    //   <UAObject NodeId="i=864" BrowseName="Default Binary" SymbolicName="DefaultBinary">
    //   <DisplayName>Default Binary</DisplayName>
    //   <References>
    //       <Reference ReferenceType="HasEncoding" IsForward="false">i=862</Reference>
    return makeStructure(dataType);
}
var makeServerStatus = function (address_space) {
    assert(address_space instanceof AddressSpace);
    nodeset.ServerState = nodeset.ServerState || registerDataTypeEnum(address_space, "ServerState");
    nodeset.ServerStatus = nodeset.ServerStatus || registerDataType(address_space, "ServerStatus");
    nodeset.ServiceCounter = nodeset.ServiceCounter || registerDataType(address_space, "ServiceCounter");
    nodeset.SessionDiagnostics = nodeset.SessionDiagnostics || registerDataType(address_space, "SessionDiagnostics");
};

exports.makeServerStatus = makeServerStatus;
