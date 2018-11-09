const http = require("http");
const host = "prepressed.se";
const path = (folder, name) => `/hlike/backup.php?key=nd9qmYpa8lf9ymP5JQuL9g&folder=${folder}&name=${name}`;
function backup(folder, name) {
  var settings = {
    method: 'POST',
    host,
    path: path(folder, name)
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

  req.on('error', e => console.log('req error', e));
  return req;

}

module.exports = backup;
