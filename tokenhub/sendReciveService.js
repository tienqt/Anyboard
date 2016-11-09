var bleno = require('bleno');
var util = require('util');

var SendCmd = require('./characteristics/sendCmd.js');
var ReceiveCmd = require('./characteristics/receiveCmd.js');

function SendReciveService() {
	bleno.PrimaryService.call(this, {
		uuid: 'ba7e949b-1440-404e-ba4a-4a94ee991f11',
		characteristics: [
			new SendCmd(),
			new ReceiveCmd()
		]
	});
};

module.exports = SendReciveService;