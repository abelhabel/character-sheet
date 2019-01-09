const _push = Array.prototype.push;
class FixedList extends Array {
  constructor(length) {
    super();
    Object.defineProperty(this, '_length', {
      configurable: false,
      value: length
    });
  }

  push(item) {
    _push.call(this, item);

    if(this.length > this._length) {
      this.shift();
    }
  }

  get(index) {
    return this[index];
  }

  get first() {
    return this[0];
  }

  get last() {
    return this[this.length -1];
  }

  get full() {
    return this.length == this._length;
  }
}

module.exports = FixedList;
