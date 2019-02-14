class SoundPlayer {
  constructor() {
    this.volume = 0.3;
    this.sounds = {
      spell: 'spell.wav',
      battle_begin: 'battle_begin.wav',
      move: 'move.wav',
      death: 'death.wav',
      victory: 'victory.wav',
      attack: 'attack.wav',
      blessing: 'blessing.wav',
      curse: 'curse.wav',
      open_book: 'open_book.wav',
      gold: 'gold.wav',
    };
    this.audio = {};
  }

  play(event, sounds = {}, preventDefault = false) {
    let src = (sounds && sounds[event]) || (!preventDefault && this.sounds[event]);
    if(!src) return;
    let a = this.audio[src] || new Audio();
    this.audio[src] = a;
    if(!this.audio[src].paused) return;
    a.src = 'sounds/' + src;
    a.volume = this.volume;
    a.play();
  }
}

module.exports = SoundPlayer;
