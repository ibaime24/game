import { game } from './game.js';

game.init(document.getElementById('game'));
window.game = game; // handy for debugging from the console
globalThis.__game = game;
