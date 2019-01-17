const fs = require('fs');
const backup = require("./backup");
var remote = process.env.NODE_ENV == 'production';
class File {
  constructor(folder, name, options) {
    this.folder = folder;
    this.name = name;
    this.path = `${__dirname}/${this.folder}/${this.name}`;
    this.options = options || {};
    this.content = '';
  }

  readRemote() {
    return backup.get(this.folder, this.name)
    .then(data => {
      this.content = data;
    })
  }

  writeRemote(data) {
    return backup.set(this.folder, this.name, data)
    .then(data => {
      this.content = data;
    })
  }

  deleteRemote() {
    return backup.del(this.folder, this.name);
  }

  read() {
    if(remote) return this.readRemote();
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
    if(remote) return this.writeRemote(data);
    return new Promise((resolve, reject) => {
      let stream = fs.createWriteStream(this.path, this.options);
      stream.on('close', () => {
        this.content = data;
        stream.close();
        resolve();
      });
      stream.on('error', reject);
      stream.on('open', () => {
        stream.write(data);
        stream.end();

      })

    })
  }

  delete() {
    if(remote) return this.deleteRemote();
    return new Promise((resolve, reject) => {
      fs.unlink(this.path, (err) => {
        if(err) return reject(err);
        resolve();
      })
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
