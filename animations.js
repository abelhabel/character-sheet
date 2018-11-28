const fs = require('fs');
module.exports = function() {
  var out = [];
  var fileNames = fs.readdirSync('animations');
  fileNames.forEach(fileName => {
    var file = fs.readFileSync('animations/' + fileName);

    out.push(file.toString().replace("{", `{id: "${fileName.replace('.json', '')}",`));
  })
  return `module.exports = [${out.join()}]`;
}
