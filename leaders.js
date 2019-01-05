const fs = require('fs');
module.exports = function() {
  var out = [];
  var fileNames = fs.readdirSync('leaders');
  fileNames.forEach(fileName => {
    var file = fs.readFileSync('leaders/' + fileName);

    out.push(file.toString().replace("{", `{id: "${fileName.replace('.json', '')}",`));
  })
  return `module.exports = [${out.join()}]`;

}
