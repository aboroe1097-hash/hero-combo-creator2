import '../css/arcade.css';
import { initArcadeHub } from './arcade-hub.js';
import { initArcadeLobbyUI } from './arcade-lobby-ui.js';

export function initArcadeSpa() {
  initArcadeHub();
  initArcadeLobbyUI();
}
