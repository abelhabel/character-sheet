class Keyboard {
  constructor(session, events) {
    this.session = session;
    this.events = events;
    let keys = Object.keys(this.events);
    this.fn = (e) => {
      console.log('keyboard', e.key, this.events)
      if(!~keys.indexOf(e.key)) return;
      this.events[e.key](e);
    }
  }

  start() {
    window.addEventListener('keyup', this.fn);
  }

  stop() {
    window.removeEventListener('keyup', this.fn);
  }
}

module.exports = Keyboard;
