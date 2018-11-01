const http = require("http");
const URL = require('url').URL;
const fs = require('fs');
const PORT = process.env.PORT || 5000;
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
const files = {
  'monsters.js': () => wrap.pre() + require('./monsters.js')() + wrap.post('monsters.js'),
  'abilities.js': () => wrap.pre() + require('./abilities.js')() + wrap.post('abilities.js')
}
// console.log(files['abilities.js'])
function loadFile(name) {
  if(name.match('.js')) {
    files[name] = wrap.pre() + fs.readFileSync(__dirname + '/' + name) + wrap.post(name);
  } else {
    files[name] = fs.readFileSync(__dirname + '/' + name);
  }
}

loadFile('CS.js');
loadFile('PositionList2d.js');
loadFile('Battle.js');
loadFile('Ability.js');
loadFile('Monster.js');
loadFile('TeamSelect.js');
loadFile('seven.js');
loadFile('ability-tpl.js');
loadFile('heroes-like.js');
loadFile('pathfinding.js');
loadFile('index.html');
loadFile('battle.html');
loadFile('DungeonCrawl_ProjectUtumnoTileset.png');
const server = http.createServer(function(req, res) {
  var url = new URL('http://home.com' + req.url);
  var name = url.pathname.replace('/', '');
  if(!name) name = 'index.html';
  if(files[name]) {
    if(typeof files[name] == 'function') {
      return res.end(files[name]());
    }
    return res.end(files[name]);
  }
  if(name == 'saveMonster') {
    let id = url.searchParams.get('id') ||  guid();
    console.log('saving', 'monsters/' + id + '.json')
    req.pipe(fs.createWriteStream('monsters/' + id + '.json'));
  }
  if(name == 'saveAbility') {
    let id = url.searchParams.get('id') ||  guid();
    console.log('saving', 'abilities/' + id + '.json')
    req.pipe(fs.createWriteStream('abilities/' + id + '.json'));
  }
  if(name.match('.wav')) {
    console.log('loading sound', name)
    res.writeHead(200, {'Content-Type': 'audio/wav'})
    return fs.createReadStream(name).pipe(res);
  }

  res.end();

});

server.listen(PORT);
