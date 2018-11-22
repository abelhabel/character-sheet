const File = require('./File.js');
const crypto = require("crypto");
const guid = require('./guid');
function createHash(secret, text) {
  var sha256 = crypto.createHash("sha256");
  sha256.update(secret, text);
  return sha256.digest("base64");
}
const tokenSecret = "0059bd7c-2ad1-1227-05de-f42557bd9f3a";
class Token {
  constructor(id, time) {
    this.id = id;
    this.time = time || Date.now().toString();
  }

  static create(token) {
    let p = token.split('.');
    let time = Buffer.from(p[0], 'base64').toString('utf8');
    let id = Buffer.from(p[1], 'base64').toString('utf8');
    return new Token(id, time);
  }

  toString() {
    let time = Buffer.from(this.time).toString('base64');
    let a = Buffer.from(this.id).toString('base64');
    let hash = createHash(tokenSecret, time + this.id);
    return time + '.' + a + '.' + hash;
  }

  static validate(token) {
    let p = token.split('.');
    let time = Buffer.from(p[0], 'base64').toString('utf8');
    let id = Buffer.from(p[1], 'base64').toString('utf8');
    let hash = createHash(tokenSecret, time + id);
    return hash == p[2];
  }
}

class User {
  constructor(id, name, password, activeGames) {
    this.id = id;
    this.name = name;
    this.password = password;
    this.activeGames = activeGames || [];
    this.wins = 0;
    this.losses = 0;
  }

  static create(name, password) {
    return new User(guid(), name, password);
  }

  joinGame(gameId) {
    this.activeGames.push(gameId);
  }

  leaveGame(gameId) {
    let i = this.activeGames.indexOf(gameId);
    if(~i) return;
    this.activeGames.splice(i, 1);
  }

  toSafe() {
    return {
      id: this.id,
      name: this.name,
      activeGames: this.activeGames,
      wins: this.wins,
      losses: this.losses
    };
  }

  save() {
    let file = new File(`${__dirname}/users/${this.id}.json`);
    return file.write(JSON.stringify(this))
    .then(() => {
      let file = new File(`${__dirname}/users/${this.name}`);
      return file.write(this.id);
    });
  }

  static load(id) {
    let file = new File(`${__dirname}/users/${id}.json`);
    return file.read()
    .then(() => {
      let data = file.js();
      return new User(data.id, data.name, data.password, data.activeGames);
    });
  }

  static loadByName(name) {
    let file = new File(`${__dirname}/users/${name}`);
    return file.read()
    .then(() => {
      console.log(file)
      let id = file.text.replace(/\s/g, '');
      return this.load(id);
    });
  }

  static loadFromToken(token) {
    let t = Token.create(token);
    return this.load(t.id);
  }

  static loginWithToken(token) {
    if(!Token.validate(token)) {
      return Promise.reject();
    }
    return this.loadFromToken(token);
  }

  static login(name, password) {
    return this.loadByName(name)
    .then(user => {
      if(!user || user.password != password) {
        throw {statusCode: 401, _message: "Invalid credentials"};
      }
      return user;
    });
  }

  createToken() {
    return new Token(this.id);
  }

  authenticate(token) {
    if(Token.validate(token)) {
      return true;
    } else {
      return false;

    }
  }

  compare(text, hash) {
    return this.hash(text) == hash;
  }


}

module.exports = User;
