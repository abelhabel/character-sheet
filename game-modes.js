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
  window._roll = (a, b) => Math.ceil(a + _random() * (b-a));
  return generator;
}

function placeUnits(arenaTpl, team, side, viewer) {
  return new Promise((resolve, reject) => {
    let arena = new Arena(arenas[1], tw, th);
    let canvas = arena.render();
    viewer.container.appendChild(canvas);
    let up = new UnitPlacement(arena, team, side);
    up.initPos();

    up.onDone = () => {
      viewer.container.removeChild(canvas);
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

gameModes.humanVSAI = function(lobby, viewer) {
  lobby.on('human vs ai game', (aiteam, aiLevel = 1) => {
    aiteam = Team.create(aiteam);
    var generator = createRNG();
    viewer.showTeamSelect();
    var onDone = (team) => {
      viewer.hideTeamSelect();

      placeUnits(arenas[1], team, 'left', viewer)
      .then(team => {
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
    var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, ['team1'], onDone, viewer.backToLobby);
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
  lobby.on('local game', (game) => {
    var generator = createRNG();
    viewer.showTeamSelect();
    var onDone = (team1, team2) => {
      viewer.hideTeamSelect();
      placeUnits(arenas[1], team1, 'left', viewer)
      .then(team1 => {
        return placeUnits(arenas[1], team2, 'right', viewer)
        .then(team2 => {
          var battle = new Battle(team1, team2, tw, th, viewer.container);
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

        })
      });
    }
    var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, ['team1', 'team2'], onDone, viewer.backToLobby)

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
    lobby.hide();
    viewer.showTeamSelect();
    var onDone = (team) => {
      viewer.hideTeamSelect();
      let side = game.owner.id == lobby.localUser.id ? 'left' : 'right';
      placeUnits(arenas[1], team, side, viewer)
      .then(selected => {
        lobby.selectTeam(game, selected);
        lobby.on('game ready', (game) => {
          viewer.hideTeamSelect();
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
              viewer.reset();
              lobby.show();
            });
            document.body.appendChild(report);

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

    var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, [lobby.localUser.name], onDone, viewer.backToLobby);


  });
};

gameModes.playByPost = function(lobby, viewer) {
  lobby.on('play by post', game => {
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
        viewer.hideTeamSelect();
        let side = game.owner.id == lobby.localUser.id ? 'left' : 'right';
        placeUnits(arenas[1], team, side, viewer)
        .then(team => {
          lobby.selectTeam(game, team);
          viewer.reset();
          lobby.show();
        });
      }
      var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, ['team1'], onDone, viewer.backToLobby);
    }
  })
}
module.exports = gameModes;
