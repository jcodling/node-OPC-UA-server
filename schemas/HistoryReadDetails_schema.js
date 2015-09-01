
var HistoryReadDetails_Schema = {
    name: "HistoryReadDetails",
    //xx baseType:"ExtensionObject",
    isAbstract: true,
    fields: [
        { name: "dataValues",        isArray: true, fieldType:"DataValue" , documentation: "An array of values of history data for the Node. The size of the array depends on the requested data parameters." },
        { name: "timestamp",        isArray: true, fieldType:"UtcTime"}
    ]
};
exports.HistoryReadDetails_Schema = HistoryReadDetails_Schema;