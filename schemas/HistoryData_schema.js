var HistoryData_Schema = {
    name: "HistoryData",
    fields: [
        { name: "dataValues",       isArray: true, fieldType:"DataValue", documentation: "An array of values of history data for the Node. The size of the array depends on the requested data parameters."},
        { name: "timestamp",        isArray: true, fieldType:"UtcTime"}
    ]
};
exports.HistoryData_Schema = HistoryData_Schema;