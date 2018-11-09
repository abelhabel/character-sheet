class WS {
  constructor() {
    const socket = new WebSocket('ws://localhost:5000');
    this.SPLITTER = '-|-';
    // Connection opened
    socket.addEventListener('open', (event) => {
      this.emit('Hello Server!');

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
      }
      this.execOn(channel, data);
    });

    this.socket = socket;

    this.channels = {};
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
