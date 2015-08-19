var r = require('rethinkdb');
var conn = null;

r.connect({ host: 'localhost', port: 28015, db: 'sensor' },
	function(err, con) {
		if (err) throw err;
		conn = con;

		r.table('usonic').run(conn, function(err, cursor) {
			if (err) throw err;
				cursor.each(function(err, row) {
					if (err) throw err;
					console.log(row['timestamp'] + "\t::\t" + row['reading']);
//					console.log(row);
				}, function() {
					conn.close(function(err) {
						if (err) throw err;
					}
				);
			});
		});
	}
);
