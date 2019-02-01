const Rand = require('Rand.js');
const TeamSelect = require('TeamSelect.js');
const Monster = require('Monster.js');
const Battle = require('Battle.js');
const Arena = require('Arena.js');
const UnitPlacement = require('UnitPlacement.js');
const Team = require('Team.js');
const arenas = require('arenas.js');
const monsters = require('monsters.js');
const tw = 42;
const th = 42;
const cash = 600;
const gameModes = {};
function assembleTeam(team) {
  return team.map(t => {
    let template = monsters.find(m => m.id == t.templateId);
    let monster = new Monster(template, t.stacks, false, t.suuid);
    return monster;
  })
}

function createRNG(seed) {
  var generator = new Rand(seed || Date.now()).generator;
  window._random = (t) => generator.random();
  window._roll = (a, b) => Math.round(a + _random() * (b-a));
  return generator;
}

function placeUnits(arenaTpl, team, side, viewer) {
  return new Promise((resolve, reject) => {
    let arena = new Arena(arenaTpl, tw, th);
    let canvas = arena.render();
    viewer.append(canvas);
    let up = new UnitPlacement(arena, team, side);
    up.initPos();

    up.onDone = () => {
      viewer.remove(canvas);
      resolve(team);
    };
    up.render(document.body);
    canvas.addEventListener('click', e => {
      let x = Math.floor(e.offsetX / arena.tw);
      let y = Math.floor(e.offsetY / arena.th);
      up.click(x, y);
    })
    arena.drawObstacles();
  })
}

gameModes.startMatch = function(lobby, viewer) {
  lobby.on('start match', match => {
    viewer.showUnitPlacement();
    console.log('starting match')
    createRNG();
    match.container = viewer.container;
    let {mode, cash, time, maxMonster} = match.settings.settings;
    let prep = Promise.resolve();
    if(mode == 'standard' && match.team1.actor == 'human') {
      if(match.team1.actor == 'human') {
        prep = prep.then(() => placeUnits(match.arena.arena, match.team1.team, 'left', viewer));
      }
      if(match.team2.actor == 'human') {
        prep = prep.then(() => placeUnits(match.arena.arena, match.team2.team, 'right', viewer));
      }
    }
    prep.then(() => {
      viewer.showBattle();
      match.container = viewer.container;
      let battle = Battle.fromMatch(match);
      battle.onGameEnd = (o) => {
        o.results.winningTeam(o.winningTeam == 'team1' ? 'You' : 'AI');
        let report = o.results.report(() => {
          battle.destroy();
          viewer.reset();
          lobby.show();
        });
        document.body.appendChild(report);
      };
      battle.start();
      window.battle = battle;
    });
  });
}

gameModes.humanVSAI = function(lobby, viewer) {
  lobby.on('human vs ai game', (aiteam, aiLevel = 1) => {
    aiteam = Team.create(aiteam);
    var generator = createRNG();
    viewer.showTeamSelect();
    var onDone = (team) => {
      viewer.showUnitPlacement();
      placeUnits(arenas[1], team, 'left', viewer)
      .then(team => {
        viewer.showBattle();
        var battle = new Battle(team, aiteam, tw, th, viewer.container);
        battle.team2.forEach(m => m.addAI(aiLevel));
        battle.onGameEnd = (o) => {
          o.results.winningTeam(o.winningTeam == 'team1' ? 'You' : 'AI');
          let report = o.results.report(() => {
            battle.destroy();
            viewer.reset();
            lobby.show();
          });
          document.body.appendChild(report);
        };
        battle.start();
        window.battle = battle;
      });
    }
    var onExit = () => {
      viewer.reset();
      lobby.show();
    };
    var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, 8, ['team1'], onDone, viewer.backToLobby);
    teamSelect.render();
  });
};

gameModes.AIVSAI = function(lobby, viewer) {
  lobby.on('ai vs ai game', (team1, team2, aiLevel = 1) => {
    team1 = Team.create(team1);
    team2 = Team.create(team2);
    var generator = createRNG();
    viewer.hideTeamSelect();
    var battle = new Battle(team1, team2, tw, th, viewer.container);
    battle.team1.forEach(m => m.addAI(aiLevel));
    battle.team2.forEach(m => m.addAI(aiLevel));
    battle.onGameEnd = (o) => {
      o.results.winningTeam(o.winningTeam);
      let report = o.results.report(() => {
        battle.destroy();
        viewer.reset();
        lobby.show();
      });
      document.body.appendChild(report);
    };
    battle.start();
    window.battle = battle;
  });
};

gameModes.localMultiplayer = function(lobby, viewer) {
  console.log('localMultiplayer', viewer)
  lobby.on('local game', (game) => {
    console.log('localMultiplayer')
    var generator = createRNG();
    viewer.showTeamSelect();
    var onDone = (team1, team2) => {
      console.log('selected teams')
      viewer.showUnitPlacement();
      placeUnits(arenas[1], team1, 'left', viewer)
      .then(team1 => {
        return placeUnits(arenas[1], team2, 'right', viewer)
        .then(team2 => {
          viewer.showBattle();
          var battle = new Battle(team1, team2, tw, th, viewer.container);
          battle.onGameEnd = (o) => {
            o.results.winningTeam(o.winningTeam);
            let report = o.results.report(() => {
              battle.destroy();
              viewer.showLobby();
            });
            document.body.appendChild(report);
          };
          battle.start();
          window.battle = battle;

        })
      });
    }
    var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, 8, ['team1', 'team2'], onDone, viewer.showLobby.bind(viewer))

    teamSelect.render();
  });
}

gameModes.localMultiplayerPortal = function(lobby, viewer) {
  lobby.on('local game', (game) => {
    var generator = createRNG();
    viewer.showTeamSelect();
    var onDone = (team1, team2) => {
      viewer.hideTeamSelect();
      var battle = new Battle(team1, team2, tw, th, viewer.container, 'portal mayhem');
      battle.onGameEnd = (o) => {
        o.results.winningTeam(o.winningTeam);
        let report = o.results.report(() => {
          battle.destroy();
          viewer.reset();
          lobby.show();
        });
        document.body.appendChild(report);
      };
      battle.start();
      window.battle = battle;
    }
    var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, 3500, 8, ['team1', 'team2'], onDone, viewer.backToLobby);

    teamSelect.render();
  });
}

gameModes.spectate = function(lobby, viewer) {
  lobby.on('start spectate', game => {
    lobby.hide();
    var generator = createRNG(game.seed);
    let team1 = assembleTeam(game.teams[0].team);
    let team2 = assembleTeam(game.teams[1].team);
    var battle = new Battle(team1, team2, tw, th, viewer.container);
    battle.onAction = (action, team) => {

    };

    battle.onGameEnd = (o) => {
      battle.destroy();
      viewer.reset();
      lobby.show();
    };


    lobby.on('battle action confirmed', (data) => {
      let a = battle.createAction(data.action);
      battle.addAction(a, true);
    })


    battle.start()
    .then(() => {
      battle.fastForward(game.actions);
    });
    window.battle = battle;
    viewer.hideTeamSelect();
  })
};

gameModes.liveMultiplayer = function(lobby, viewer) {
  lobby.on('remote game', (game) => {
    var generator = createRNG(game.seed);
    viewer.showTeamSelect();
    var onDone = (team) => {
      viewer.showUnitPlacement();
      let side = game.owner.id == lobby.localUser.id ? 'left' : 'right';
      placeUnits(arenas[1], team, side, viewer)
      .then(selected => {
        viewer.showWaitingRoom();
        lobby.selectTeam(game, selected);
        lobby.on('game ready', (game) => {
          console.log('game is ready');
          viewer.showBattle();
          let localTeam = game.teams.find(t => t.user.id == lobby.localUser.id);
          let remoteTeam = game.teams.find(t => t.user.id != lobby.localUser.id);
          let firstTeam = game.owner.id == lobby.localUser.id ? localTeam.team : remoteTeam.team;
          let secondTeam = game.owner.id != lobby.localUser.id ? localTeam.team : remoteTeam.team;
          let localName = localTeam.user.name;
          let remoteName = remoteTeam.user.name;
          if(game.owner.id == lobby.localUser.id) {
            firstTeam = localTeam.team;
            secondTeam = remoteTeam.team;
            localTeam = 'team1';
          } else {
            firstTeam = remoteTeam.team;
            secondTeam = localTeam.team;
            localTeam = 'team2';
          }
          var battle = new Battle(firstTeam, secondTeam, tw, th, viewer.container);

          battle.onAction = (action, team) => {
            if(team != localTeam) return;
            lobby.battleAction(game, action);
          };
          battle.onGameEnd = (o) => {
            o.results.winningTeam(localTeam == o.winningTeam ? localName : remoteName);
            let report = o.results.report(() => {
              if(o.winningTeam == localTeam) {
                lobby.winGame(game);
              } else {
                lobby.loseGame(game);
              }
              battle.destroy();
              viewer.showLobby();
            });
            viewer.append(report);

          };
          lobby.on('battle action confirmed', (data) => {
            let a = battle.createAction(data.action);
            battle.addAction(a, true);
          })
          battle.start();
          window.battle = battle;

        })
      })
    }

    var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, 8, [lobby.localUser.name], onDone, viewer.backToLobby);


  });
};

gameModes.playByPost = function(lobby, viewer) {
  lobby.on('play by post', game => {
    let hasPickedTeam = game.teams.find(t => t.user.id == lobby.localUser.id);
    let isFull = game.full;
    console.log(lobby.localUser, game)
    if(game.teams.length < 2 && hasPickedTeam) return;
    lobby.hide();
    if(game.teams && game.teams.length == 2) {
      var generator = createRNG(game.seed);
      let localTeam = game.teams.find(t => t.user.id == lobby.localUser.id);
      let remoteTeam = game.teams.find(t => t.user.id != lobby.localUser.id);
      let firstTeam = game.owner.id == lobby.localUser.id ? localTeam.team : remoteTeam.team;
      let secondTeam = game.owner.id != lobby.localUser.id ? localTeam.team : remoteTeam.team;
      if(game.owner.id == lobby.localUser.id) {
        firstTeam = localTeam.team;
        secondTeam = remoteTeam.team;
        localTeam = 'team1';
      } else {
        firstTeam = remoteTeam.team;
        secondTeam = localTeam.team;
        localTeam = 'team2';
      }
      console.log(firstTeam, secondTeam)
      var battle = new Battle(firstTeam, secondTeam, tw, th, viewer.container);
      battle.onAction = (action, team) => {
        if(team != localTeam) return;
        lobby.battleAction(game, action);
      };
      battle.onGameEnd = (o) => {
        if(o.winningTeam == localTeam) {
          lobby.winGame(game);
        } else {
          lobby.loseGame(game);
        }
        battle.destroy();
        viewer.reset();
        lobby.show();
      };
      lobby.on('battle action confirmed', (data) => {
        let a = battle.createAction(data.action);
        battle.addAction(a, true);
      })
      battle.start()
      .then(() => {
        battle.fastForward(game.actions);
      });
      window.battle = battle;
      viewer.hideTeamSelect();
    } else
    if(game.teams && game.teams.find(t => t.user.id == lobby.localUser.id)) {
      console.log('team has been selected. waiting for other player to select team');
      viewer.hideTeamSelect();
    } else {
      lobby.hide();
      viewer.showTeamSelect();
      var onDone = (team) => {
        console.log('team', team)
        viewer.hideTeamSelect();
        let side = game.owner.id == lobby.localUser.id ? 'left' : 'right';
        placeUnits(arenas[1], team, side, viewer)
        .then(team => {
          lobby.selectTeam(game, team);
          viewer.reset();
          lobby.show();
        });
      }
      var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, 8, [lobby.localUser.name], onDone, viewer.backToLobby);
    }
  })
}
module.exports = gameModes;
