var File = require('./File');
var guid = require('./guid');
function update(name) {
  let file = new File('teams', name);
  return file.read().then(() => {
    let out = file.js();
    out.units.forEach(unit => {
      unit.suuid = guid();
    })
    return file.write(JSON.stringify(out));
  })
}

module.exports = update;
