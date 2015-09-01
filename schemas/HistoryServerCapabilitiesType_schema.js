/**
 * Created by jeff on 15-09-01.
 */

var HistoryServerCapabilitiesType_Schema = {
    name: "HistoryReadDetails",
    //xx baseType:"ExtensionObject",
    isAbstract: true,
    fields: [
        { name: "AccessHistoryDataCapability", isArray: false, fieldType: "Boolean", documentation: "Mandatory"},
        { name: "AccessHistoryEventsCapability", isArray: false, fieldType: "Boolean", documentation: "Mandatory"},
        { name: "MaxReturnDataValues", isArray: false, fieldType: "Integer", documentation: "Mandatory"},
        { name: "MaxReturnEventValues", isArray: false, fieldType: "Integer", documentation: "Mandatory"},
        { name: "InsertDataCapability", isArray: false, fieldType: "Boolean", documentation: "Mandatory"},
        { name: "ReplaceDataCapability", isArray: false, fieldType: "Boolean", documentation: "Mandatory"},
        { name: "UpdateDataCapability", isArray: false, fieldType: "Boolean", documentation: "Mandatory"},
        { name: "DeleteRawCapability", isArray: false, fieldType: "Boolean", documentation: "Mandatory"},
        { name: "DeleteAtTimeCapability", isArray: false, fieldType: "Boolean", documentation: "Mandatory"},
        { name: "InsertEventCapability", isArray: false, fieldType: "Boolean", documentation: "Mandatory"},
        { name: "ReplaceEventCapability", isArray: false, fieldType: "Boolean", documentation: "Mandatory"},
        { name: "UpdateEventCapability", isArray: false, fieldType: "Boolean", documentation: "Mandatory"},
        { name: "DeleteEventCapability", isArray: false, fieldType: "Boolean", documentation: "Mandatory"},
        { name: "InsertAnnotationsCapability", isArray: false, fieldType: "Boolean", documentation: "Mandatory"},
        { name: "AggregateFunctions", isArray: true, fieldType: "FolderType", documentation: "Mandatory"}
    ]
};
exports.HistoryServerCapabilitiesType_Schema = HistoryServerCapabilitiesType_Schema;