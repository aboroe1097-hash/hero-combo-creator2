import { readFileSync } from 'node:fs';

// Browser-only cloud double: no Firebase requests or production writes.
export async function installAdminCloudFixture(page, { superadmin = true, theme = 'dark' } = {}) {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.route('https://firestore.googleapis.com/**', (route) => route.abort());
  await page.route('**/js/firebase.js*', (route) => {
    const source = readFileSync(new URL('../../js/firebase.js', import.meta.url), 'utf8');
    const names = [...source.matchAll(/^export (?:async )?(?:function|const) (\w+)/gm)].map(
      (m) => m[1]
    );
    route.fulfill({
      contentType: 'text/javascript',
      body: [
        'export const firebaseConfig = {};',
        ...names.map(
          (name) => `export const ${name} = window.__auditFirebase.${name} || (() => null);`
        ),
      ].join('\n'),
    });
  });
  await page.route('**/js/firebase-sdk.js*', (route) => {
    const source = readFileSync(new URL('../../js/firebase-sdk.js', import.meta.url), 'utf8');
    route.fulfill({
      contentType: 'text/javascript',
      body: source
        .replace(
          "return import('firebase/firestore');",
          'return Promise.resolve(window.__auditFirestore);'
        )
        .replace(
          "return import('firebase/firestore/lite');",
          'return Promise.resolve(window.__auditFirestore);'
        ),
    });
  });
  await page.addInitScript(
    ({ superadmin, theme }) => {
      localStorage.setItem('vts_hero_lang', 'en');
      localStorage.setItem('vts_theme', theme);
      localStorage.setItem('vts_maintenance_bypass', '1');
      if (!localStorage.getItem('vts_admin_eden_workspace'))
        localStorage.setItem('vts_admin_eden_workspace', 'eden-x2');
      const user = {
        uid: 'audit-admin',
        isAnonymous: false,
        getIdToken: async () => 'isolated-test-token',
        getIdTokenResult: async () => ({ claims: { admin: true, superadmin } }),
      };
      const db = {};
      window.__auditFirebase = {
        initFirebase: () => ({ configured: true, db, auth: { currentUser: user }, app: {} }),
        getDb: () => db,
        getCurrentUser: () => user,
        waitForAuthReady: async () => user,
        ensureAnonymousAuth: async () => user,
        isPasswordAuthUser: async () => true,
        isAdminAuthUser: async () => true,
        isSuperAdminAuthUser: async () => superadmin,
        getFirebaseAdminClaim: async () => true,
        getFirebaseSuperAdminClaim: async () => superadmin,
        onUserChanged: (callback) => {
          queueMicrotask(() => callback(user));
          return () => {};
        },
        callListUserRoles: async () => ({
          members: [{ uid: user.uid, displayName: 'Audit Admin', admin: true, superadmin }],
          nextPageToken: '',
        }),
      };
      const records = new Map(
        Object.entries(
          JSON.parse(sessionStorage.getItem('audit-cloud-records') || 'null') || {
            'vts_admin/eden_x2_dashboard_data': {
              r5Season: 'season-2027',
              attacks: [],
              players: [],
              dutyRecords: [],
              contributionRecords: [],
              syncRevision: 1,
            },
            'vts_admin/eden_x2_vote_settings': {
              season: 'season-2027',
              showManagementResults: true,
              showManagementVoteCounts: false,
            },
            'vts_admin/eden_x2_management_votes': {
              season: 'season-2027',
              rows: [{ playerName: 'Reviewed leader', votes: 10 }],
            },
            'vts_admin/season_registry': {
              schemaVersion: 1,
              seasons: [
                {
                  id: 'season-2027',
                  label: 'Eden X2',
                  workspaceId: 'eden-x2',
                  state: 'active',
                  startedAtMs: 1,
                  endedAtMs: 0,
                },
              ],
            },
            'vts_admin/operations_config': {
              revision: 1,
              notice: 'Audit notice',
              readOnly: false,
              disabledFeatures: [],
              expiresAtMs: 0,
            },
            'errors/audit-error': {
              source: 'isolated-test',
              error: { message: 'Investigated test report' },
              path: '/admin.html',
            },
          }
        )
      );
      window.__auditRecords = records;
      const listeners = new Map();
      const snapshot = (ref) => ({
        id: ref.path.split('/').pop(),
        ref,
        exists: () => records.has(ref.path),
        data: () => structuredClone(records.get(ref.path)),
      });
      const collectionSnapshot = (ref) => {
        const docs = [...records.keys()]
          .filter(
            (path) =>
              path.startsWith(`${ref.path}/`) && !path.slice(ref.path.length + 1).includes('/')
          )
          .map((path) => snapshot({ path }));
        return {
          docs,
          empty: !docs.length,
          size: docs.length,
          forEach: (callback) => docs.forEach(callback),
        };
      };
      const notify = (ref) => {
        sessionStorage.setItem('audit-cloud-records', JSON.stringify(Object.fromEntries(records)));
        for (const callback of listeners.get(ref.path) || []) callback(snapshot(ref));
      };
      const set = (ref, value) => {
        records.set(ref.path, structuredClone(value));
        notify(ref);
      };
      window.__auditExternalUpdate = set;
      window.__auditFirestore = {
        getFirestore: () => db,
        doc: (_db, ...parts) => ({ path: parts.join('/') }),
        collection: (_db, ...parts) => ({ path: parts.join('/'), kind: 'collection' }),
        getDoc: async (ref) => snapshot(ref),
        getDocFromServer: async (ref) => snapshot(ref),
        getDocs: async (ref) => collectionSnapshot(ref),
        onSnapshot: (ref, callback) => {
          const list = listeners.get(ref.path) || [];
          list.push(callback);
          listeners.set(ref.path, list);
          queueMicrotask(() =>
            callback(ref.kind === 'collection' ? collectionSnapshot(ref) : snapshot(ref))
          );
          return () =>
            listeners.set(
              ref.path,
              list.filter((item) => item !== callback)
            );
        },
        setDoc: async (ref, value) => set(ref, value),
        updateDoc: async (ref, value) => set(ref, { ...records.get(ref.path), ...value }),
        deleteDoc: async (ref) => {
          records.delete(ref.path);
          notify(ref);
        },
        query: (ref) => ref,
        where: () => null,
        orderBy: () => null,
        limit: () => null,
        serverTimestamp: () => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }),
        Timestamp: { fromMillis: (ms) => ({ seconds: Math.floor(ms / 1000), nanoseconds: 0 }) },
        runTransaction: async (_db, run) => {
          const writes = [];
          const result = await run({
            get: async (ref) => snapshot(ref),
            set: (ref, value) => writes.push([ref, value]),
          });
          writes.forEach(([ref, value]) => set(ref, value));
          return result;
        },
        writeBatch: () => {
          const writes = [];
          return {
            set: (ref, value) => writes.push([ref, value]),
            commit: async () => writes.forEach(([ref, value]) => set(ref, value)),
          };
        },
      };
    },
    { superadmin, theme }
  );
}
