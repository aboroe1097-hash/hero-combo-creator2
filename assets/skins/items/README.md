# Skin item icons

Drop cropped in-game item icons here as WebP files named after the item's
`iconId` in `js/skins-db.js` (`SKIN_TIERS` cost lists). The Skin Atlas renders
a placeholder slot for every cost item and swaps in the icon automatically
once the matching asset exists — no code changes needed.

Current slots (56x56 px square crops work best):

- `epic-hero-medal.webp`
- `legendary-hero-medal.webp`
- `seasonal-legendary-hero-medal.webp`
- `biography-seal.webp`
- `advanced-biography-seal.webp`

## Adding and checking an icon

Use the item IDs in [js/skins-db.js](../../../js/skins-db.js) as the naming authority. Preserve aspect ratio and transparent padding; compare light and dark backgrounds before replacing a placeholder. Keep source credit with the contribution and check the Skins view after a production build. Do not add an icon for an unverified cost item merely to fill a slot.

[Documentation index](../../../docs/README.md)
