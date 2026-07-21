import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const db = new Database('dev.db');
const blockId = randomUUID();
const logId = randomUUID();
const docId = '0aa0e355-0cdf-49d8-85d3-1fe6e0f301c2';
const otherClientId = 'external-test-client-999';
const now = new Date().toISOString();
const content = 'LIVE SYNC WORKS - ' + new Date().toLocaleTimeString();

const operation = JSON.stringify({
  id: logId,
  documentId: docId,
  action: 'UPDATE_BLOCK',
  payload: { id: blockId, documentId: docId, type: 'p', content, index: 'zzz-external', version: 1, clientId: otherClientId, clientTimestamp: now, deleted: false },
  timestamp: Date.now()
});

db.prepare(`INSERT OR REPLACE INTO Block (id, documentId, type, content, "index", version, clientId, clientTimestamp, deleted) VALUES (?,?,?,?,?,?,?,?,?)`).run(blockId, docId, 'p', content, 'zzz-external', 1, otherClientId, now, 0);
db.prepare(`INSERT INTO SyncLog (id, documentId, clientId, operation) VALUES (?,?,?,?)`).run(logId, docId, otherClientId, operation);

console.log('SUCCESS - Injected:', content);
console.log('Block ID:', blockId);
db.close();
