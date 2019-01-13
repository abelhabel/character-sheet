const Rand = require('Rand.js');
const TeamSelect = require('TeamSelect.js');
const Monster = require('Monster.js');
const Battle = require('Battle.js');
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

gameModes.humanVSAI = function(lobby, viewer) {
  lobby.on('human vs ai game', (aiteam, aiLevel = 1) => {
    var generator = createRNG();
    viewer.showTeamSelect();
    var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, 1, () => {
      viewer.hideTeamSelect();
      aiteam = assembleTeam(aiteam.units);
      console.log(aiteam)
      var battle = new Battle(teamSelect.teams[0], aiteam, tw, th, viewer.container);
      teamSelect.teams[0].forEach(m => m.ai = false);
      aiteam.forEach(m => m.addAI(aiLevel));
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

    teamSelect.render();
  });
};

gameModes.AIVSAI = function(lobby, viewer) {
  lobby.on('ai vs ai game', (team1, team2, aiLevel = 1) => {
    console.log('ai vs ai', team1, team2, aiLevel)
    var generator = createRNG();
    viewer.hideTeamSelect();
    team1 = assembleTeam(team1.units);
    team2 = assembleTeam(team2.units);
    var battle = new Battle(team1, team2, tw, th, viewer.container);
    team1.forEach(m => m.addAI(aiLevel));
    team2.forEach(m => m.addAI(aiLevel));
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
    var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, 2, () => {
      viewer.hideTeamSelect();
      var battle = new Battle(teamSelect.teams[0], teamSelect.teams[1], tw, th, viewer.container);
      teamSelect.teams[0].forEach(m => {
        // m.addAI(1)
        m.ai = false;
      });
      teamSelect.teams[1].forEach(m => {
        // m.addAI(1)
        m.ai = false;
      });
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

    teamSelect.render();
  });
}

gameModes.spectate = function(lobby, viewer) {
  lobby.on('start spectate', game => {
    console.log('start spectate mode', game)
    lobby.hide();
    var generator = createRNG(game.seed);
    let team1 = assembleTeam(game.teams[0].team);
    let team2 = assembleTeam(game.teams[1].team);
    var battle = new Battle(team1, team2, tw, th, viewer.container);
    battle.onAction = (action, team) => {
      console.log('battle.onAction', action)
    };

    battle.onGameEnd = (o) => {
      battle.destroy();
      viewer.reset();
      lobby.show();
    };


    lobby.on('battle action confirmed', (data) => {
      console.log('battle action confirmed', data);
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
    console.log(game)
    var generator = createRNG(game.seed);
    console.log('remote game', game);
    lobby.hide();
    viewer.showTeamSelect();
    var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, 1, (team) => {
      console.log('team selected', team);
      var selected = team.map(m => {
        return {
          templateId: m.template.id,
          stacks: m.stacks
        }
      })
      lobby.selectTeam(game, selected);
      lobby.on('game ready', (game) => {
        viewer.hideTeamSelect();
        console.log('battle can start', game);
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
        var battle = new Battle(assembleTeam(firstTeam), assembleTeam(secondTeam), tw, th, viewer.container);

        battle.onAction = (action, team) => {
          if(team != localTeam) return;
          console.log('battle.onAction', action)
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
          console.log('battle action confirmed', data);
          let a = battle.createAction(data.action);
          battle.addAction(a, true);
        })
        battle.start();
        window.battle = battle;

      })
    });

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
      var battle = new Battle(assembleTeam(firstTeam), assembleTeam(secondTeam), tw, th, viewer.container);
      console.log(battle.team1, battle.team2)
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
      var teamSelect = new TeamSelect(monsters, viewer.selectContainer, tw, th, cash, 1, (team) => {
        var selected = team.map(m => {
          return {
            templateId: m.template.id,
            stacks: m.stacks
          }
        })
        lobby.selectTeam(game, selected);
        viewer.reset();
        lobby.show();
      });
    }
  })
}
module.exports = gameModes;
