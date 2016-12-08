/**
 * Initiates the server which starts listening on the specified port
 * @param  {number} listenPort The port used for incoming connections
 */
AnyBoard.Server = function(listenPort, win, fail) {
    var net = require('net');
    var tcpServer = net.createServer();
    tcpServer.on('connection', AnyBoard.Server._onConnection);
    tcpServer.listen(listenPort, function() {
        AnyBoard.Logger.debug("Server listening for connections on port " +  listenPort, this);
        win();
    });

    AnyBoard.Server._clients  = [];

    AnyBoard.Server.listeners = {
        localEvent: {},
        remoteEvent: {},
        systemEvent: {}
    };
}

AnyBoard.Server._onConnection = function(client) {
    client.isLocal = false;         // Local player
    client.isRemote = false;        // Remote (pervasive) player
    client.recBuffer = "";          // Receive-buffer. Used for building up long messages.
    
    client.on('data',  _onClientReceive);
    client.on('end', _onClientEnd);
    client.on('error', _onClientError);
    
    function _onClientReceive(data) {
        AnyBoard.Logger.debug("Network data received: " + data, this);
        var recString = String.fromCharCode.apply(null, data);
        var strings = recString.split('@');

        // Example receive: {"size":72}@{"type":"SYSTEM_EVENT","name":"CREATE","options":{"player_id":"Tien"}}@

        for(var s in strings) {
            if(strings[s] == "")
                continue;

            try {
                var json = JSON.parse(strings[s]);
                if(json.hasOwnProperty('size')) {
                    client.recRemaining = json.size;
                    continue;
                }
            } catch(e) {
                // Do nothing
            }

            if(client.recRemaining >= 0) {
                AnyBoard.Logger.debug("MSG: " + strings[s], this);
                client.recRemaining -= strings[s].length;
                client.recBuffer += strings[s];

                // When all bytes received, parse json 
                if(client.recRemaining == 0) {      
                    var json = JSON.parse(client.recBuffer);
                    json.options.client = client;

                    switch(json.type) {
                        case "SYSTEM_EVENT":
                            AnyBoard.Server._triggerEvent(AnyBoard.Server.listeners.systemEvent, json.name, json.options);
                        break;

                        case "LOCAL_EVENT":
                            AnyBoard.Server._triggerEvent(AnyBoard.Server.listeners.localEvent, json.name, json.options);
                        break;

                        case "REMOTE_EVENT":
                            AnyBoard.Server._triggerEvent(AnyBoard.Server.listeners.remoteEvent, json.name, json.options);
                        break;
                    } 
                    client.recBuffer = ""; 
                }
            }
        }
    }

    function _onClientEnd() {
        AnyBoard.Server._clients.splice(AnyBoard.Server._clients.indexOf(client), 1);
        AnyBoard.Server._triggerEvent(AnyBoard.Server.listeners.systemEvent, 'DISCONNECTED', client);
        AnyBoard.Logger.debug(client.remoteAddress + " disconnected. Remaining: " + AnyBoard.Server._clients.length, this);
    }

    function _onClientError(err) {
        AnyBoard.Server._triggerEvent(AnyBoard.Server.listeners.systemEvent, 'ERROR', client);
        AnyBoard.Logger.debug(client.remoteAddress + " Error: " + err.message, this);
    }
    
    AnyBoard.Server._clients.push(client);
    AnyBoard.Logger.debug(client.remoteAddress + " client connected. Total: " + AnyBoard.Server._clients.length, this);
    AnyBoard.Server._triggerEvent(AnyBoard.Server.listeners.systemEvent, 'CONNECTED', client);
}

AnyBoard.Server._triggerEvent = function(dict, event, args) {
    AnyBoard.Logger.debug('Event triggered: ' + event, this);
    if (dict[event]) {
        for (var i in dict[event]) {
            if (dict[event].hasOwnProperty(i))
                dict[event][i](args);
        }
    }  
}


/**
 * Add listener for "Remote Event" - events that happen as result of a remote-players actions (pervasive)
 * @param  {string} eventName Game specific event name
 * @param  {remoteEventCallback} callbackFunction
 */
AnyBoard.Server.onRemoteEvent = function(eventName, callbackFunction) {
    AnyBoard.Logger.debug('Added listener to Remote-event: ' + eventName, this);
    if (!this.listeners.remoteEvent[eventName])
        this.listeners.remoteEvent[eventName] = [];
    this.listeners.remoteEvent[eventName].push(callbackFunction);
};

/**
 * Add listener for "Local Event" - events that happens as result of local player actions (at the gameboard)
 * @param  {string} eventName Game specific event name
 * @param  {localEventCallback} callbackFunction
 */
AnyBoard.Server.onLocalEvent = function(eventName, callbackFunction) {
    AnyBoard.Logger.debug('Added listener to Local-event: ' + eventName, this);
    if (!this.listeners.localEvent[eventName])
        this.listeners.localEvent[eventName] = [];
    this.listeners.localEvent[eventName].push(callbackFunction);
};

/**
 * Add listener for "System Event" - events that are not related to game mechanics.
 * @param  {string} eventName Game specific event name
 * @param  {systemEventCallback} callbackFunction
 */
AnyBoard.Server.onSystemEvent = function(eventName, callbackFunction) {
    AnyBoard.Logger.debug('Added listener to Player-event: ' + eventName, this);
    if (!this.listeners.systemEvent[eventName])
        this.listeners.systemEvent[eventName] = [];
    this.listeners.systemEvent[eventName].push(callbackFunction);
};

/**
 * Builds an event message and sents it to a client.
 * @param  {socket} client Client socket
 * @param  {string} eventType "SYSTEM_EVENT", "LOCAL_EVENT" or "REMOTE_EVENT"
 * @param  {string} eventName User defined name for the event. Eg. "TEXT_MESSAGE"
 * @param  {object} options Event parameters / data to be sent
 * @param  {winCallback} win
 * @param  {failCallback} fail
 */
AnyBoard.Server.sendEvent = function(client, eventType, eventName, options, win, fail) {
    var toSend = {
        type: eventType,
        name: eventName,
        options: options
    };
    var sendStr = JSON.stringify(toSend);
    var sendStrSize = JSON.stringify({ size: sendStr.length });
    
    AnyBoard.Logger.debug("Sends event " + eventName, this);

    client.write(sendStrSize + "@" + sendStr + "@");
    AnyBoard.Logger.debug("Event " + eventName + " was sent", this);
};