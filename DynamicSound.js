const Canvas = require("Canvas.js");
class DynamicSound {
  constructor() {
    this.channels = 1;
    this.sampleRate = 2024;
    this.bitsPerSample = 16;
    this.seconds = 2;
    this.volume = 32767;
    this.frequency = 440;
    this.cached = null;
  }

  render() {
    let w = 400;
    let h = 200;
    let c = new Canvas(w, h);
    this.generate();
    let audio = new Audio("data:audio/wav;base64," + this.cached);
    c.on('click', e => {
      audio.play()
      .then(() => console.log('sound fin'))
      .catch(err => console.log('sound err', err, this))
    });
    return c;
  }

  generate(f) {
    var {channels, sampleRate, bitsPerSample, seconds, volume, frequency} = this;

    var data = [];
    var samples = 0;

    // Generate the sine waveform
    for(var i = 0; i < sampleRate * seconds; i++) {
      for (var c = 0; c < channels; c++) {
        var v = volume * Math.sin((2 * Math.PI) * (i / sampleRate) * frequency);
        data.push(this.pack("v", v));
        samples++;
      }
    }

    data = data.join('');

    // Format sub-chunk
    var chunk1 = [
      "fmt ", // Sub-chunk identifier
      this.pack("V", 16), // Chunk length
      this.pack("v", 1), // Audio format (1 is linear quantization)
      this.pack("v", channels),
      this.pack("V", sampleRate),
      this.pack("V", sampleRate * channels * bitsPerSample / 8), // Byte rate
      this.pack("v", channels * bitsPerSample / 8),
      this.pack("v", bitsPerSample)
    ].join('');

    // Data sub-chunk (contains the sound)
    var chunk2 = [
      "data", // Sub-chunk identifier
      this.pack("V", samples * channels * bitsPerSample / 8), // Chunk length
      data
    ].join('');

    // Header
    var header = [
      "RIFF",
      this.pack("V", 4 + (8 + chunk1.length) + (8 + chunk2.length)), // Length
      "WAVE"
    ].join('');

    var out = [header, chunk1, chunk2].join('');
    var dataURI = btoa(out);
    this.cached = dataURI;
  }

  pack(fmt) {
    var output = '';

    var argi = 1;
    for (var i = 0; i < fmt.length; i++) {
      var c = fmt.charAt(i);
      var arg = arguments[argi];
      argi++;

      switch (c) {
        case "a":
          output += arg[0] + "\0";
          break;
        case "A":
          output += arg[0] + " ";
          break;
        case "C":
        case "c":
          output += String.fromCharCode(arg);
          break;
        case "n":
          output += String.fromCharCode((arg >> 8) & 255, arg & 255);
          break;
        case "v":
          output += String.fromCharCode(arg & 255, (arg >> 8) & 255);
          break;
        case "N":
          output += String.fromCharCode((arg >> 24) & 255, (arg >> 16) & 255, (arg >> 8) & 255, arg & 255);
          break;
        case "V":
          output += String.fromCharCode(arg & 255, (arg >> 8) & 255, (arg >> 16) & 255, (arg >> 24) & 255);
          break;
        case "x":
          argi--;
          output += "\0";
          break;
        default:
          throw new Error("Unknown pack format character '"+c+"'");
      }
    }

    return output;
  }
}

module.exports = DynamicSound;
