var usonic = require('r-pi-usonic');
var sensor = usonic.createSensor(24, 23, 1000);
setTimeout(function() {
	console.log('Distance: ' + sensor() + ' cm');
}, 60);
