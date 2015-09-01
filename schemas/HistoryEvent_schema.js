/**
 * Created by jeff on 15-09-01.
 */

var HistoryEvent_Schema = {
    name: "HistoryEvent",
    fields: [
        { name: "eventFields",        isArray: true, fieldType:"BaseDataType" , documentation: "List of selected Event fields. This will be a one to one match with the fields selected in EventFilter" }
    ]
};
exports.HistoryEvent_Schema = HistoryEvent_Schema;