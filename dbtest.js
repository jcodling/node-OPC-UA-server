// set up sensor
var usonic = require("r-pi-usonic");
var sensor = usonic.createSensor(24, 23, 500);

// set up db
var r = require("rethinkdb");
var conn = null;

r.connect( { host: 'localhost', port: 28015, db: 'sensor' },
	function(err, con) {
		if (err) throw err;
		conn = con;
	}
);

// read sensor and write result into database at 1 second intervals
var vi = setInterval(function() {
	var range = sensor();
	console.log(range);

	// insert value into database
	r.table("usonic").insert({
		reading: range,
		timestamp: new Date()
	}).run(conn, function(err, result) {
		if (err) throw err;
		console.log("written");
	});
}, 1000);

// clean exit
var exit = function() {
	clearInterval(vi);
	conn.close(functon(err) { if (err) throw err; });
	console.log("\n\nClean Exit");
};

process.on('SIGINT', exit);
