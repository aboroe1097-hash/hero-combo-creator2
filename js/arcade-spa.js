import '../css/arcade.css';
import { initArcadeHub } from './arcade-hub.js';
import { initArcadeLobbyUI } from './arcade-lobby-ui.js';
import { translations } from './translations.js';
import { currentLanguage } from './state.js';
import { mountSiegeFeature } from './siege-promo.js';

export function initArcadeSpa() {
  mountSiegeFeature(document.getElementById('arcadeLobby'), {
    getCopy: () => translations[currentLanguage] || translations.en,
  });
  initArcadeHub();
  initArcadeLobbyUI();
}
