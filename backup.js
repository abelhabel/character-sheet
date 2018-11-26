const http = require("http");
const host = "prepressed.se";
const setpath = (folder, name) => `/hlike/backup.php?key=nd9qmYpa8lf9ymP5JQuL9g&folder=${folder}&name=${name}`;
const getpath = (folder, name) => `/hlike/backup_get.php?key=nd9qmYpa8lf9ymP5JQuL9g&folder=${folder}&name=${name}`;
const getFolderPath = (folder, name) => `/hlike/backup_getall.php?key=nd9qmYpa8lf9ymP5JQuL9g&folder=${folder}`;

function backup(folder, name) {
  var settings = {
    method: 'POST',
    host,
    path: setpath(folder, name)
  };
  var req = http.request(settings, (res) => {
    var data = '';
    res.on('data', chunk => {
      data += chunk.toString();
    });
    res.on('error', e => console.log('res error', e));
    res.on('end', () => {
    })
  });

  return req;

}
function get(folder, name) {
  return new Promise((resolve, reject) => {
    var settings = {
      method: 'GET',
      host,
      path: getpath(folder, name)
    };
    var req = http.request(settings, (res) => {
      var data = '';
      res.on('data', chunk => {
        data += chunk.toString();
      });
      res.on('error', e => reject(e));
      res.on('end', () => {
        resolve(data);
      })
    });
    req.end();
  })

}

function getFolder(folder) {
  return new Promise((resolve, reject) => {
    var settings = {
      method: 'GET',
      host,
      path: getFolderPath(folder)
    };
    var req = http.request(settings, (res) => {
      var data = '';
      res.on('data', chunk => {
        data += chunk.toString();
      });
      res.on('error', e => reject(e));
      res.on('end', () => {
        resolve(data);
      })
    });
    req.end();
  })

}

function set(folder, name, data) {
  return new Promise((resolve, reject) => {
    var settings = {
      method: 'POST',
      host,
      path: setpath(folder, name)
    };
    var req = http.request(settings, (res) => {
      var data = '';
      res.on('data', chunk => {
        data += chunk.toString();
      });
      res.on('error', e => reject(e));
      res.on('end', () => {
        resolve(data);
      })
    });
    req.write(data);
    req.end();
  })

}
module.exports = {
  stream: backup,
  set: set,
  get: get,
  getFolder: getFolder
}
