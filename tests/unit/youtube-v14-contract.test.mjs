import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const youtubeSource = readFileSync('js/youtube-v14.js', 'utf8');
const loaderSource = readFileSync('js/loader-v14.js', 'utf8');
const youtubeStyles = readFileSync('css/youtube-v14.css', 'utf8');
const indexSource = readFileSync('index.html', 'utf8');

test('YouTube loader uses only YouTube/VTS visuals and never DM crafting art', () => {
  const youtubePresentationStart = loaderSource.indexOf('youtube: presentation({');
  const adminPresentationStart = loaderSource.indexOf(
    'admin: presentation({',
    youtubePresentationStart
  );
  assert.notEqual(youtubePresentationStart, -1);
  assert.notEqual(adminPresentationStart, -1);

  const youtubePresentation = loaderSource.slice(youtubePresentationStart, adminPresentationStart);
  assert.match(youtubePresentation, /#youtubeSection \.youtube-library-mark svg/);
  assert.match(youtubePresentation, /youtube-playlist-card--journey/);
  assert.match(youtubePresentation, /youtube-playlist-card--recruitment/);
  assert.match(youtubePresentation, /youtube-playlist-card--guides/);
  assert.match(youtubePresentation, /#youtubeSection \.youtube-load-button svg/);
  assert.doesNotMatch(youtubePresentation, /assets\/dm\/|material|equipment/i);
});

test('playlist selection drives restrained ambient themes in dark and light modes', () => {
  assert.match(youtubeSource, /const PLAYLIST_AMBIENCE_BY_TITLE_KEY = Object\.freeze/);
  assert.match(youtubeSource, /root\.dataset\.youtubeAmbience = getPlaylistAmbience\(card\)/);
  assert.match(youtubeSource, /syncPlaylistAmbience\(card, true\)/);
  assert.match(youtubeSource, /prefers-reduced-motion: reduce/);

  for (const ambience of ['journey', 'recruitment', 'guides']) {
    assert.match(youtubeStyles, new RegExp(`data-youtube-ambience='${ambience}'`));
  }
  assert.match(
    youtubeStyles,
    /\[data-theme='light'\] #youtubeSection\.youtube-library\[data-youtube-ambience=/
  );
  assert.match(youtubeStyles, /@keyframes youtube-ambience-enter/);
  assert.match(youtubeStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(youtubeStyles, /\[dir='rtl'\] #youtubeSection\.youtube-library/);
  assert.match(youtubeStyles, /@media \(max-width: 768px\)/);
});

test('YouTube remains consent-driven with retry and direct-playlist fallbacks', () => {
  assert.doesNotMatch(indexSource, /<iframe[^>]+youtube/i);
  assert.match(youtubeSource, /const loadSelectedPlaylist = \(\) =>/);
  assert.match(youtubeSource, /document\.createElement\('iframe'\)/);
  assert.match(youtubeSource, /loadButton\.addEventListener\('click', loadSelectedPlaylist\)/);
  assert.match(youtubeSource, /retryButton\.addEventListener\('click', loadSelectedPlaylist\)/);
  assert.match(youtubeSource, /isSafeYouTubeUrl\(watchUrl\)/);
  assert.match(
    indexSource,
    /id="youtubeFeaturedExternal"[^>]+target="_blank"[^>]+rel="noopener noreferrer"/
  );
});
