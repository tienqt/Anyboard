AnyBoard.ServerHandler = {
    socket: null,
    listeners: {
        localEvent: {},
        remoteEvent: {},
        systemEvent: {}
    },
    onceListeners: {
        onceLocalEvent: {},
        onceRemoteEvent: {},
        onceSystemEvent: {}
    }
};

AnyBoard.ServerHandler.trigger = function(type, event, args) { 
    var BaseTrigger = function(dict, event, args1){
        if (dict[event]) {
            for (var i in dict[event]) {
                if (dict[event].hasOwnProperty(i)) {
                    AnyBoard.Logger.log('Event triggered: ' + event);
                    dict[event][i](args1);
                }
            }
        } 
    } 
    
    var DeleteOnceListeners = function(dict, eventName){
        if(eventName in dict){
            AnyBoard.Logger.log("Deleted oncelistner: " + eventName);
            delete dict[eventName];
        }
    };

    if(type === "SYSTEM_EVENT") {
        BaseTrigger(this.listeners.systemEvent, event, args);
        BaseTrigger(this.onceListeners.onceSystemEvent, event, args); 
        DeleteOnceListeners(this.onceListeners.onceSystemEvent, event);
    }else if(type === "LOCAL_EVENT") {
        BaseTrigger(this.listeners.localEvent, event, args);
        BaseTrigger(this.onceListeners.onceLocalEvent, event, args); 
        DeleteOnceListeners(this.onceListeners.onceLocalEvent, event);
    }else if(type === "REMOTE_EVENT") {
        BaseTrigger(this.listeners.remoteEvent, event, args);
        BaseTrigger(this.onceListeners.onceRemoteEvent, event, args); 
        DeleteOnceListeners(this.onceListeners.onceRemoteEvent, event);
    }    
};

AnyBoard.ServerHandler._socket = {};

var socketId = null;
var remainingBytes = 0;
var receiveBuffer = "";

AnyBoard.ServerHandler._onRecive = function(info){ 
    var data = String.fromCharCode.apply(null, new Uint8Array(info.data));
    var encodedStrings = data.split("@");

    for(var index = 0; index<encodedStrings.length; index++) {
        var encodedString = encodedStrings[index];
        if(encodedString == "") {
            continue;
        }
     
        try {
            var jsn = JSON.parse(encodedString);
            if(jsn.hasOwnProperty('size')) {
                remainingBytes = jsn.size;
                continue;
            }
        } catch(e) {}

        if(remainingBytes >= 0) {
            remainingBytes -= encodedString.length; 
            receiveBuffer += encodedString;

            if(remainingBytes == 0) {
                var jsn = JSON.parse(receiveBuffer);
                AnyBoard.ServerHandler.trigger(jsn.type, jsn.name, jsn.options);
                receiveBuffer = ""; 
            }
        }
    }
};



AnyBoard.ServerHandler._onReciveError = function(info){
    AnyBoard.Logger.log("Socket #" + info.socketId + " failed to receive: " + info.resultCode);
};

AnyBoard.ServerHandler.connect = function(hostaddress, port, win, fail) {
    AnyBoard.Logger.log("Connecting to " + hostaddress + ":" + port);
    
    chrome.sockets.tcp.create({}, function(createInfo) {
        socketId = createInfo.socketId;

        chrome.sockets.tcp.connect(createInfo.socketId, hostaddress, port, function(result) {
            if(result < 0) {
                AnyBoard.Logger.log("Failed to connect " + hostaddress + ":" + port);
                fail(result);
                return;
            }
            AnyBoard.Logger.log("Connected to " + hostaddress + ":" + port);
            win();
        });
       
        chrome.sockets.tcp.onReceive.addListener(function(info) {
            AnyBoard.ServerHandler._onRecive(info);
        });

        chrome.sockets.tcp.onReceiveError.addListener(function(info) { 
            AnyBoard.ServerHandler._onReciveError(info);    
        });
    });
};

AnyBoard.ServerHandler.joinGame = function(gamePin, playerid) {
    var request = {
        type: "SYSTEM_EVENT",
        name: "JOIN",
        options: {
            player_id: playerid,
            game_pin: gamePin
        }
    };
    AnyBoard.ServerHandler._rawSend(JSON.stringify(request));
};

AnyBoard.ServerHandler.tap = function(tap, gamePin) {
    var request = {
        type: "LOCAL_EVENT",
        name: "CHECK_ANSWER",
        options: {
            answer: tap,
            game_pin: gamePin
        }
    };
    AnyBoard.ServerHandler._rawSend(JSON.stringify(request));
};

AnyBoard.ServerHandler.createGame = function(userid) {
    var request = {
        type: "SYSTEM_EVENT",
        name: "CREATE",
        options: {
            player_id: userid
        }
    };
    AnyBoard.ServerHandler._rawSend(JSON.stringify(request));
};

AnyBoard.ServerHandler.remotePlayer = function(userid, gamePin) {
    var request = {
        type: "SYSTEM_EVENT",
        name: "REMOTE_SELECTED",
        options: {
            player_id: userid,
            game_pin: gamePin
        }
    };
    AnyBoard.ServerHandler._rawSend(JSON.stringify(request));
};

AnyBoard.ServerHandler.startGame = function(gamePin) {
    var request = {
        type: "SYSTEM_EVENT",
        name: "START_GAME",
        options: {
            game_pin: gamePin
        }
    };
    AnyBoard.ServerHandler._rawSend(JSON.stringify(request));
};

AnyBoard.ServerHandler.sendPhoto = function(photo, gamePin) {
    var request = {
        type: "REMOTE_EVENT",
        name: "PHOTO",
        options: { 
            photo: photo,
            game_pin: gamePin
        }
    };
    AnyBoard.ServerHandler._rawSend(JSON.stringify(request));
};

AnyBoard.ServerHandler.positionMessage = function(text, position, gamePin) {
    var request = {
        type: "LOCAL_EVENT",
        name: "POSITION_MESSAGE",
        options: {
            text: text,
            position: position,
            game_pin: gamePin
        }
    };
    AnyBoard.ServerHandler._rawSend(JSON.stringify(request));
};

AnyBoard.ServerHandler._rawSend = function(string) {
    var ab = AnyBoard.Utils.stringToArrayBuffer(string + "@");
    var lenght = ab.byteLength -1;

    var request = {
        size: lenght
    };
    var r = AnyBoard.Utils.stringToArrayBuffer(JSON.stringify(request) + "@");

    chrome.sockets.tcp.send(socketId, r, function(sendInfo) {
        if(sendInfo.resultCode >= 0) {
           // AnyBoard.Logger.log("String sent: " + string);
        } else {
           // AnyBoard.Logger.log("Failed to send string: " + string);
        }
    });

    chrome.sockets.tcp.send(socketId, ab, function(sendInfo) {
        if(sendInfo.resultCode >= 0) {
           // AnyBoard.Logger.log("String sent: " + string);
        } else {
           // AnyBoard.Logger.log("Failed to send string: " + string);
        }
    });
};

AnyBoard.ServerHandler.onSystemEvent = function(eventName, callbackFunction) {
    AnyBoard.Logger.log('Added listener to System-event: ' + eventName);
    if (!this.listeners.systemEvent[eventName])
        this.listeners.systemEvent[eventName] = [];
    this.listeners.systemEvent[eventName].push(callbackFunction);
};

AnyBoard.ServerHandler.onceSystemEvent = function(eventName, callbackFunction) {
    AnyBoard.Logger.log('Added oncelistener to System-event: ' + eventName);
    if (!this.onceListeners.onceSystemEvent[eventName])
        this.onceListeners.onceSystemEvent[eventName] = [];
    this.onceListeners.onceSystemEvent[eventName].push(callbackFunction);
};

AnyBoard.ServerHandler.onLocalEvent = function(eventName, callbackFunction) {
    AnyBoard.Logger.log('Added listener to Local-event: ' + eventName);
    if (!this.listeners.localEvent[eventName])
        this.listeners.localEvent[eventName] = [];
    this.listeners.localEvent[eventName].push(callbackFunction);
};

AnyBoard.ServerHandler.onceLocalEvent = function(eventName, callbackFunction) {
    AnyBoard.Logger.log('Added listener to Local-event: ' + eventName);
    if (!this.listeners.onceLocalEvent[eventName])
        this.listeners.onceLocalEvent[eventName] = [];
    this.listeners.onceLocalEvent[eventName].push(callbackFunction);
};

AnyBoard.ServerHandler.onRemoteEvent = function(eventName, callbackFunction) {
    AnyBoard.Logger.log('Added listener to Remote-event: ' + eventName);
    if (!this.listeners.remoteEvent[eventName])
        this.listeners.remoteEvent[eventName] = [];
    this.listeners.remoteEvent[eventName].push(callbackFunction);
};

AnyBoard.ServerHandler.onceRemoteEvent = function(eventName, callbackFunction) {
    AnyBoard.Logger.log('Added listener to Remote-event: ' + eventName);
    if (!this.listeners.onceRemoteEvent[eventName])
        this.listeners.onceRemoteEvent[eventName] = [];
    this.listeners.onceRemoteEvent[eventName].push(callbackFunction);
};

