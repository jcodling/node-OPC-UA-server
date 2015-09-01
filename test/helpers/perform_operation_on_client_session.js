require("requirish")._(module);
var async = require("async");
var should = require("should");
var _ = require("underscore");
var assert = require("better-assert");
var opcua = require("../../");
var ClientSubscription = opcua.ClientSubscription;
var resolveNodeId = opcua.resolveNodeId;
var AttributeIds = opcua.AttributeIds;
/**
 * simple wrapper that operates on a freshly created opcua session.
 * The wrapper:
 *   - connects to the server,
 *   - creates a session
 *   - calls your **callback** method (func) with the session object
 *   - closes the session
 *   - disconnects the client
 *   - finally call the final **callback** (done_func)
 * @param client
 * @param endpointUrl  {String}
 * @param {Function} func
 * @param func.session  {Session} the done callback to call when operation is completed
 * @param func.done  {Function} the done callback to call when operation is completed
 * @param [func.done.err]  {Error} an optional error to pass if the function has failed
 * @param {Function} done_func
 * @param [done_func.err]  {Error} an optional error to pass if the function has failed
 */
function perform_operation_on_client_session(client, endpointUrl, func, done_func) {

    assert(_.isFunction(func));
    assert(_.isFunction(done_func));
    var the_session = null;

    async.series([

        // connect

        function (callback) {
            //xx console.log("xxxxx connecting to server ...");
            client.connect(endpointUrl, function (err) {
                //xx console.log("xxxxx connection OK");
                callback(err);
            });
        },

        // create session
        function (callback) {
            //xx console.log("xxxxx creating session ...");
            client.createSession(function (err, session) {
                if (!err) {
                    //xx console.log("xxxxx session  created ...");
                    the_session = session;
                }
                callback(err);
            });
        },

        // call the user provided func
        function (callback) {
            func(the_session, callback);
        },

        // closing session
        function (callback) {
            the_session.close(function (err) {
                callback(err);
            });
        },

        // disconnect
        function (callback) {
            client.disconnect(function () {
                callback();
            });
        }
    ], done_func);
}
exports.perform_operation_on_client_session = perform_operation_on_client_session;


/**
 *  simple wrapper that operates on a freshly created subscription.
 *
 *  - connects to the server,and create a session
 *  - create a new subscription with a publish interval of 100 ms
 *  - calls your **callback** method (do_func) with the subscription object
 *  - delete the subscription
 *  - close the session and disconnect from the server
 *  - finally call the final **callback** (done_func)
 *
 * @param client {OPCUAClientBase}
 * @param endpointUrl {String}
 * @param {Function} do_func
 * @param do_func.session  {Session} the done callback to call when operation is completed
 * @param do_func.done  {Function} the done callback to call when operation is completed
 *
 * @param {Function} done_func
 * @param {Error} [done_func.err]
 */
// callback function(session, subscriptionId,done)
function perform_operation_on_subscription(client, endpointUrl, do_func, done_func) {

    perform_operation_on_client_session(client, endpointUrl, function (session, done) {

        var subscription;
        async.series([

            function (callback) {
                subscription = new ClientSubscription(session, {
                    requestedPublishingInterval: 100,
                    requestedLifetimeCount: 10 * 60,
                    requestedMaxKeepAliveCount: 5,
                    maxNotificationsPerPublish: 2,
                    publishingEnabled: true,
                    priority: 6
                });
                subscription.on("started", function () {
                    callback();
                });
            },

            function (callback) {
                do_func(session, subscription, callback);
            },

            function (callback) {
                subscription.on("terminated", callback);
                subscription.terminate();
            }
        ], function (err) {
            done(err);
        });

    }, done_func);
}

exports.perform_operation_on_subscription = perform_operation_on_subscription;

function perform_operation_on_monitoredItem(client, endpointUrl, monitoredItemId, func, done_func) {

    perform_operation_on_subscription(client, endpointUrl, function (session, subscription, inner_done) {

        var monitoredItem;
        async.series([
            function (callback) {
                monitoredItem = subscription.monitor({
                    nodeId: resolveNodeId(monitoredItemId),
                    attributeId: AttributeIds.Value
                }, {
                    samplingInterval: 1000,
                    discardOldest: true,
                    queueSize: 1
                });

                monitoredItem.on("initialized", function () {
                    callback();
                });
            },
            function (callback) {
                func(session, subscription, monitoredItem, callback);
            },
            function (callback) {
                monitoredItem.terminate(function () {
                    callback();
                });
            }
        ], inner_done);

    }, done_func);
}
exports.perform_operation_on_monitoredItem = perform_operation_on_monitoredItem;
