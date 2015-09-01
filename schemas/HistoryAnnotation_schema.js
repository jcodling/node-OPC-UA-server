/**
 * Created by jeff on 15-09-01.
 */

var HistoryAnnotation_Schema = {
    name: "HistoryReadDetails",
    //xx baseType:"ExtensionObject",
    isAbstract: true,
    fields: [
        { name: "message", isArray: false, fileType: "String", documentation: "Annotation message or text"},
        { name: "username", isArray: false, fileType: "String", documentation: "The user that added the annotation, as supplied by underlying system"},
        { name: "annotationTime", isArray: false, fileType: "UtcTime", documentation: "The time the Annotation was added. This will probably be different than the SourceTimestamp"}
    ]
};
exports.HistoryAnnotation_Schema = HistoryAnnotation_Schema;