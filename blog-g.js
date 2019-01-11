require('./date-extension');
const fs = require("fs");
const File = require("./File");
let d = new Date(Date.now());
let id = d.format('y-M-d-T');
let date = d.toGMTString();
let shortDate = date.substr(0, 16);
let tpl = new File('.', 'blog-template.html');
let out = new File('blog', id + '.html');

tpl.read().then(() => {
  return eval(`\`${tpl.text}\``);
})
.then(c => out.write(c))
.then(() => console.log("all done"))
.catch(e => console.log('error', e))
