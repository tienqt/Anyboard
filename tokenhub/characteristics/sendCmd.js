var bleno = require('bleno');
var os = require('os');
var util = require('util');

var BlenoCharacteristic = bleno.Characteristic;
var Descriptor = bleno.Descriptor;

var SendCmdCharacteristic = function() {
	SendCmdCharacteristic.super_.call(this, {
		uuid: '4161ef35-64a0-4f65-855d-05b4caf06c8b',
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

util.inherits(SendCmdCharacteristic, BlenoCharacteristic);

SendCmdCharacteristic.prototype.onReadRequest = function(offset, callback){
	this._value = new Buffer(JSON.stringify({
      'hello': 'tien'
    }));
	
	console.log('TestCharacteristic - onReadRequest: value = ' + this._value.toString('hex'));
	//callback(this.RESULT_SUCCESS, this._value);
};

var callbacks = [];

SendCmdCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
	this._value = data;
	console.log('TestCharacteristic - onWriteRequest: value = ' + this._value.toString('hex'));

	//if (this._updateValueCallback) {
    //	console.log('TestCharacteristic - onWriteRequest: notifying');
    //	this._updateValueCallback(this._value);
  	//}

	
  	callback(BlenoCharacteristic.RESULT_SUCCESS);

 	var response = Buffer(1);
 	response[0] = data[0];

 	var name = "Tien";
 	
 	var newResp = Buffer.concat([response, new Buffer(name, 'utf8')], response.length + name.length);
  	//sleep(1000);
  	callbacks[0](newResp);
};


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

SendCmdCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
	
	callbacks.push(updateValueCallback);

	//this._value = new Buffer('T', 'utf8');
	
	console.log('Someone subscribed? MaxValueSize: ' + maxValueSize);
	//
	//var command = new Buffer(1);
	//command[0] = 101;
	//var message = "hei";
//
	//var newBuffer = Buffer.concat([command, new Buffer(message, 'utf8')], 1 + message.length);
//
	//
	//
//
	//setInterval(function() {
   //     updateValueCallback(this.RESULT_SUCCESS, newBuffer);
    //}, 1000);
	
	//updateValueCallback(this.RESULT_SUCCESS);
};


module.exports = SendCmdCharacteristic;