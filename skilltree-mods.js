const fs = require('fs');
module.exports = function() {
  var out = [];
  var fileNames = fs.readdirSync('skilltree-mods');
  fileNames.forEach(fileName => {
    var file = fs.readFileSync('skilltree-mods/' + fileName);

    out.push(file.toString().replace("{", `{id: "${fileName.replace('.json', '')}",`));
  })
  return `module.exports = [${out.join()}]`;
}
