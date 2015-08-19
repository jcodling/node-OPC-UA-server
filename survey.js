var statistics = require('math-statistics');
var usonic = require('r-pi-usonic');
var gpio = require('onoff').Gpio;

var greenled = new gpio(17, 'out');
var redled = new gpio(27, 'out');

var init = function(config) {
	var sensor = usonic.createSensor(config.echoPin, config.triggerPin, config.timeout);
	var distances;

	(function measure() {
		if (!distances || distances.length === config.rate) {
			if (distances) {
				print(distances);
			}

			distances = [];
		}

		setTimeout(function() {
			distances.push(sensor());

			measure();
		}, config.delay);
	}());
};

var print = function(distances) {
	var distance = statistics.median(distances);

	process.stdout.clearLine();
	process.stdout.cursorTo(0);

	if (distance < 0) {
		process.stdout.write('Error: Measure timeout.\n');
	} else {
		process.stdout.write('Distance: ' + distance.toFixed(2) + ' cm');
		if(distance > 15) {
			greenled.writeSync(1);
			redled.writeSync(0);
		} else {
			greenled.writeSync(0);
			redled.writeSync(1);
		}
	}
};

function exit() {
	redled.writeSync(0);
	greenled.writeSync(0);
	redled.unexport();
	greenled.unexport();
	console.log("\nExiting");
	process.exit();
};

init({
	echoPin: 24,
	triggerPin: 23,
	timeout: 1000,
	delay: 60,
	rate: 5,
});

process.on('SIGINT', exit);
