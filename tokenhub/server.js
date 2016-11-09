var AnyBoard = require('../anyboard-library/dist/anyboard.js');
var bleno = require('bleno');
var util = require('util');

var SendReciveCmdService = require('./sendReciveService');
var sendReciveCmdService = new SendReciveCmdService();

bleno.on('advertisingStart', function(error) {
	console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));
	if(!error) {
		bleno.setServices([
    		sendReciveCmdService
    	]);
	}
});


bleno.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state);

  if (state === 'poweredOn') {
    bleno.startAdvertising('AnyBoardHub', [sendReciveCmdService.uuid]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('accept', function(addr) {
  console.log('Client connected: ' + addr);
});

bleno.on('disconnect', function(addr) {
  console.log('Client disconnected: ' + addr);
});