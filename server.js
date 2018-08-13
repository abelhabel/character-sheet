const http = require("http");
const URL = require('url').URL;
const fs = require('fs');
const wrap = {
  pre: () => '(function (module) {\n',
  post: (name) => `\n})(new Module("${name}"))`
}
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
const files = {}
function loadFile(name) {
  if(name.match('.js')) {
    files[name] = wrap.pre() + fs.readFileSync(__dirname + '/' + name) + wrap.post(name);
  } else {
    files[name] = fs.readFileSync(__dirname + '/' + name);
  }
}

loadFile('CS.js');
loadFile('seven.js');
loadFile('heroes-like.js');
loadFile('index.html');
loadFile('DungeonCrawl_ProjectUtumnoTileset.png');
const server = http.createServer(function(req, res) {
  var url = new URL('http://home.com' + req.url);
  var name = url.pathname.replace('/', '');
  if(!name) name = 'index.html';
  if(files[name]) {
    return res.end(files[name]);
  }
  if(name == 'saveMonster') {
    req.pipe(fs.createWriteStream('monsters/' + guid() + '.json'));
  }

  res.end();

});

server.listen(5000);
