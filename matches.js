const fs = require('fs');
module.exports = function() {
  var out = [];
  var fileNames = fs.readdirSync('matches');
  fileNames.forEach(fileName => {
    var file = fs.readFileSync('matches/' + fileName);

    out.push(file.toString().replace("{", `{id: "${fileName.replace('.json', '')}",`));
  })
  return `module.exports = [${out.join()}]`;
}
