const VELO_ASSET_ROOT = 'assets/velo';

export function veloMascotMarkup(variant = 'inline') {
  const safeVariant = /^[a-z-]+$/.test(variant) ? variant : 'inline';
  return `<span class="velo-mascot velo-mascot--${safeVariant}" aria-hidden="true">
    <span class="velo-mascot__stage">
      <img class="velo-mascot__body" src="${VELO_ASSET_ROOT}/velo-body.webp" alt="" draggable="false" />
      <img class="velo-mascot__body velo-mascot__body--angry" src="${VELO_ASSET_ROOT}/velo-body.webp" alt="" draggable="false" />
      <img class="velo-mascot__helmet" src="${VELO_ASSET_ROOT}/velo-helmet.webp" alt="" draggable="false" />
      <span class="velo-mascot__helmet-reaction">
        <img class="velo-mascot__horn velo-mascot__horn--left" src="${VELO_ASSET_ROOT}/velo-body.webp" alt="" draggable="false" />
        <img class="velo-mascot__horn velo-mascot__horn--right" src="${VELO_ASSET_ROOT}/velo-body.webp" alt="" draggable="false" />
        <span class="velo-mascot__eye velo-mascot__eye--left"></span>
        <span class="velo-mascot__eye velo-mascot__eye--right"></span>
      </span>
      <img class="velo-mascot__burst" src="${VELO_ASSET_ROOT}/velo-burst.webp" alt="" draggable="false" />
    </span>
  </span>`;
}

export function createVeloMascot(variant = 'inline') {
  const template = document.createElement('template');
  template.innerHTML = veloMascotMarkup(variant).trim();
  return template.content.firstElementChild;
}

export function mountVeloMascots(root = document) {
  root.querySelectorAll('[data-velo-mascot]').forEach((slot) => {
    slot.replaceWith(createVeloMascot(slot.dataset.veloMascot || 'inline'));
  });
}
