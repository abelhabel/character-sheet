if(!Date.prototype.format) {
  Date.prototype.format = function(str, options) {
    if(!str) return this;
    options = options || {};
    var out = '';
    for(var i = 0; i < str.length; i++) {
      switch(str.charAt(i)) {
        case 'm':
          out += this.toString().substr(4,3);
          break;
        case 'M':
          out += this.toISOString().substr(5, 2);
          break;
        case 'd':
          out += this.toString().substr(8,2);
          break;
        case 'D':
          out += this.toString().substr(0,3);
          break;
        case 'y':
          out += this.getFullYear();
          break;
        case 'd':
          out += this.toString().substr(0,3);
          break;
        case 't':
          var time = this.toString().substr(16, 5);
          if(options.time && options.time == 12) {
            var hour = this.toString().substr(16, 2);
            var ampm = Number(hour) >= 12 ? 'PM' : 'AM';
            hour = (Number(hour)) % (12);
            var min = this.toString().substr(19, 2);
            var timeDivider = options.hasOwnProperty('timeDivider') ? options.timeDivider : ':';
            time = hour + timeDivider + min + ' ' + ampm;
          }
          out += time;
          break;
        case 'T':
          var hour = this.toString().substr(16, 2);
          var ampm = Number(hour) >= 12 ? 'PM' : 'AM';
          hour = (Number(hour)) % (12);
          out += hour + ampm;
          break;
        default:
          out += str.charAt(i);
      }
    }
    return out;
  };
}
