const protocol = self.location.protocol == 'https:' ? 'wss:' : 'ws:';
class WS {
  constructor() {
    this.pingTimeout = null;
    this.serverTime = 20000;
    const socket = new WebSocket(`${protocol}//${self.location.host}`);
    this.SPLITTER = '-|-';
    // Connection opened
    socket.addEventListener('open', (event) => {
      this.emit('Hello Server!');

    });
    socket.addEventListener('ping', (event) => {
      this.heartbeat();
    });
    // Listen for messages
    socket.addEventListener('message', (event) => {
      var all = event.data.split(this.SPLITTER);
      var channel = all[0];
      var data = '';
      if(typeof all[1] == 'string') {
        try {
          data = JSON.parse(all[1]);
        } catch (e) {
          console.log('no parsable data');
        }
      };
      this.execOn(channel, data);
    });

    this.socket = socket;

    this.channels = {};
  }

  heartbeat() {
    clearTimeout(this.pingTimeout);
    this.pingTimeout = setTimeout(() => {
      this.socket.terminate();
    }, this.serverTime + 1000);
  }

  emit(channel, data) {
    if(typeof data != 'object') return;
    this.socket.send(channel + this.SPLITTER + JSON.stringify(data));
  }

  on(channel, fn) {
    this.channels[channel] = 'on';
    // postMessage({
    //
    // })
  }

  execOn(channel, data) {
    // if(typeof this.channels[channel] != 'function') {
    //   return;
    // }
    postMessage({
      channel: channel,
      data: data,
      method: 'on'
    })
    // this.channels[channel](data);
  }
}

var socket = new WS();

onmessage = function(e) {
  var {channel, data, method} = e.data;
  if(method === 'emit') {
    socket.emit(channel, data);
  }

}
