const fs = require('fs');
const File = require('./File.js');
class Folder {
  constructor(folder) {
    this.folder = folder;
    this.path = `${__dirname}/${this.folder}`;
    this.fileNames = [];
    this.files = [];
  }

  readFileNames() {
    return new Promise((resolve, reject) => {
      fs.readdir(this.path, (e, fileNames) => {
        if(e) return reject(e);
        this.fileNames = Array.from(fileNames);
        resolve(this.fileNames);
      })
    })
  }

  read() {
    return this.readFileNames()
    .then(fns => {
      this.files = this.fileNames.map(fn => new File(this.folder, fn));
      return Promise.all(this.files.map(f => f.read()));
    })
  }

  get text() {
    return this.files.map(f => f.text).join('');
  }
}

module.exports = Folder;
