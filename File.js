const fs = require('fs');
class File {
  constructor(path, options) {
    this.path = path;
    this.options = options || {};
    this.content = '';
  }

  read() {
    return new Promise((resolve, reject) => {
      let stream = fs.createReadStream(this.path, this.options);
      let data = [];
      stream.on('data', chunk => data.push(chunk));
      stream.on('end', () => {
        this.content = Buffer.concat(data);
        stream.close();
        resolve();
      });
      stream.on('error', reject);

    })
  }

  write(data) {
    return new Promise((resolve, reject) => {
      let stream = fs.createWriteStream(this.path, this.options);
      stream.write(data);
      stream.on('close', () => {
        this.content = data;
        stream.close();
        resolve();
      });
      stream.on('error', reject);
      stream.end();

    })
  }

  get text() {
    return this.content.toString();
  }

  js() {
    let out = '';
    try {
      out = JSON.parse(this.content.toString());
    } catch (e) {

    }
    return out;
  }
}

module.exports = File;
