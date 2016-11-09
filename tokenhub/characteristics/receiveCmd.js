var bleno = require('bleno');
var os = require('os');
var util = require('util');


var BlenoCharacteristic = bleno.Characteristic;
var Descriptor = bleno.Descriptor;

var ReceiveCmdCharacteristic = function() {
	ReceiveCmdCharacteristic.super_.call(this, {
		uuid: '67207b7b-b519-448c-a0cf-37580ee99833',
		properties: ['read', 'write', 'notify'],
		descriptors: [
			new Descriptor({
				uuid: '2901',
				value: 'value'
			})
		]
	});

	this._value = new Buffer(0);
};

util.inherits(ReceiveCmdCharacteristic, BlenoCharacteristic);

ReceiveCmdCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
	this._value = data;
	console.log('TestCharacteristic - onWriteRequest: value = ' + this._value.toString('hex'));

	//if (this._updateValueCallback) {
    //	console.log('TestCharacteristic - onWriteRequest: notifying');
    //	this._updateValueCallback(this._value);
  	//}

  	callback(this.RESULT_SUCCESS);
};

ReceiveCmdCharacteristic.prototype.onReadRequest = function(offset, callback){
	this._value = new Buffer(JSON.stringify({
      'hello': 'tien'
    }));
	
	console.log('TestCharacteristic - onReadRequest: value = ' + this._value.toString('hex'));
	//callback(this.RESULT_SUCCESS, this._value);
};

module.exports = ReceiveCmdCharacteristic;