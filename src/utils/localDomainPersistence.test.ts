import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DOMAIN_STATE_STORAGE_KEY,
  loadPersistedDomainState,
  mergeDomainRecordsById,
  savePersistedDomainState,
} from './localDomainPersistence';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, val: string) => {
      map.set(key, val);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

test('savePersistedDomainState and loadPersistedDomainState round-trip edited records across reload/logout', () => {
  const storage = createMemoryStorage();
  const ok = savePersistedDomainState(
    {
      version: 1,
      guardianProfile: {
        displayName: 'Updated Guardian',
        email: 'guardian.new@psms.gov.bd',
        phone: '01811223344',
      },
    },
    storage
  );
  assert.equal(ok, true);
  assert.ok(storage.getItem(DOMAIN_STATE_STORAGE_KEY));

  const restored = loadPersistedDomainState(storage);
  assert.equal(restored?.guardianProfile?.displayName, 'Updated Guardian');
  assert.equal(restored?.guardianProfile?.phone, '01811223344');
});

test('mergeDomainRecordsById preserves user edits and appended records cleanly', () => {
  const base = [
    { id: '1', name: 'Original 1', extra: 'keep' },
    { id: '2', name: 'Original 2', extra: 'keep2' },
  ];
  const overrides = [
    { id: '1', name: 'Edited 1', extra: 'keep' },
    { id: '3', name: 'Added 3', extra: 'new' },
  ];
  const merged = mergeDomainRecordsById(base, overrides);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].name, 'Edited 1');
  assert.equal(merged[1].id, '3');
});
