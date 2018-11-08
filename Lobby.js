class Lobby {
  constructor() {
    this.localUser = '';
    this.users = [];
    this.games = [];
    this.tags = {};
  }

  enter() {
    var name = window.prompt('Name:');
    this.localUser = name;
    this.users.push(this.localUser);
    this.update();
  }

  leave(user) {
    this.users.splice(this.users.indexOf(user));
    if(user == this.localUser) {
      this.localUser = '';
    }
    this.update();
  }

  createGame(user) {
    this.games.push({
      owner: user,
      users: [user],
      id: Math.random(),
      max: 2,
      start() {
        console.log('started game')
      }
    })
    this.update();
  }

  joinGame(game, user) {
    game.users.push(user);
    if(game.users.length == game.max) {
      game.start();
    }
    this.update();
  }

  stopGame(game) {
    this.games.splice(this.games.indexOf(game));
    this.update();
  }

  renderGame(game) {
    let c = document.createElement('div');
    Object.assign(c.style, {
      width: '100%',
      height: '100px',
      border: '1px solid lightgray'
    })
    if(game.owner != this.localUser) {
      let joinGame = document.createElement('button');
      joinGame.textContent = 'Join Game';
      joinGame.addEventListener('click', () => this.joinGame(game, this.localUser));
      c.appendChild(joinGame);
    } else {
      let stopGame = document.createElement('button');
      stopGame.textContent = 'Stop Game';
      stopGame.addEventListener('click', () => this.stopGame(game, this.localUser));
      c.appendChild(stopGame);
    }
    let html = `<p>
      Created by: ${game.owner}<br>
      ${game.users.length}/${game.max}
    </p>`;
    let d = document.createElement('div');
    d.innerHTML = html;
    c.appendChild(d);
    return c;
  }

  renderUser(user) {
    let c = document.createElement('div');
    Object.assign(c.style, {
      width: '100%',
      border: '1px solid lightgray',
    })
    c.textContent = user;
    return c;
  }

  update() {
    if(!this.localUser) {
      this.tags.enter.style.display = 'inline-block';
      this.tags.create.style.display = 'none';
    } else {
      this.tags.enter.style.display = 'none';
      this.tags.create.style.display = 'inline-block';
    }
    this.tags.games.innerHTML = '';
    this.games.forEach(g => {
      let tag = this.renderGame(g);
      this.tags.games.appendChild(tag);
    })
    this.tags.users.innerHTML = '';
    this.users.forEach(g => {
      let tag = this.renderUser(g);
      this.tags.users.appendChild(tag);
    })
  }

  render() {
    let c = document.createElement('div');
    Object.assign(c.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: '800px',
      height: '600px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      border: '1px solid gray'
    })
    let buttons = document.createElement('div');
    buttons.classList.add('buttons');
    let create = document.createElement('button');
    create.textContent = 'Create Game';
    create.addEventListener('click', () => this.createGame(this.localUser));

    let enter = document.createElement('button');
    enter.textContent = 'Enter';
    enter.addEventListener('click', () => this.enter());
    buttons.appendChild(create);
    buttons.appendChild(enter);
    let users = document.createElement('div');
    let games = document.createElement('div');
    Object.assign(users.style, {
      display: 'inline-block',
      width: '50%',
      height: '90%',
      verticalAlign: 'top'
    });
    Object.assign(games.style, {
      display: 'inline-block',
      width: '50%',
      height: '90%',
      verticalAlign: 'top'
    })
    c.appendChild(buttons);
    c.appendChild(users);
    c.appendChild(games);
    document.body.appendChild(c);

    this.tags.users = users;
    this.tags.games = games;
    this.tags.create = create;
    this.tags.enter = enter;
    this.update();
  }

}

module.exports = Lobby;
