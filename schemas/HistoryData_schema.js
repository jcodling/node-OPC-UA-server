var HistoryData_Schema = {
    name: "HistoryData",
    fields: [
        { name: "dataValues", isArray: true, fieldType:"DataValue" },
        { name: "timestamp", isArray: true, fieldType:"DateTime"}
    ]
};
exports.HistoryData_Schema = HistoryData_Schema;