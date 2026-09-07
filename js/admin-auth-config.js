window.VTS_ADMIN_AUTH = window.VTS_ADMIN_AUTH || {
  // Destructive-action override hashes are injected at build time from the
  // VTS_ADMIN_OVERRIDE_CODE / VTS_ADMIN_OVERRIDE_HASH secrets (see
  // scripts/inject-admin-auth-config.mjs). They are intentionally empty here so
  // no override hash is ever committed to the public repo.
  clearHash: '',
  deleteHashes: [],
  rosterPassHashes: {},
};
