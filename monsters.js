const fs = require('fs');
var out = [];
var fileNames = fs.readdirSync('monsters');
fileNames.forEach(fileName => {
  var file = fs.readFileSync('monsters/' + fileName);
  out.push(file);
})
module.exports = `module.exports = [${out.join()}]`;
