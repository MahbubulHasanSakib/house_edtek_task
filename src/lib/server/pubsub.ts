import { Client } from 'pg';
import { sseEmitter } from './sse';

let listenClient: Client | null = null;
let isListening = false;

/**
 * Initializes a dedicated Postgres client for listening to notifications.
 * This runs once per Next.js worker process.
 */
export async function initPubSub() {
  if (isListening || !process.env.DATABASE_URL) return;
  isListening = true;

  try {
    listenClient = new Client({ connectionString: process.env.DATABASE_URL });
    await listenClient.connect();

    listenClient.on('notification', (msg) => {
      if (msg.channel === 'sync_updates' && msg.payload) {
        try {
          const data = JSON.parse(msg.payload);
          // Broadcast to local SSE streams connected to this specific worker process
          sseEmitter.emit(`doc:${data.documentId}`, data.payload);
        } catch (e) {
          console.error('[PubSub] Failed to parse notification payload', e);
        }
      }
    });

    await listenClient.query('LISTEN sync_updates');
    console.log('[PubSub] Listening for Postgres notifications on sync_updates');
  } catch (error) {
    console.error('[PubSub] Failed to initialize listener', error);
    isListening = false;
    if (listenClient) {
      listenClient.end().catch(() => {});
      listenClient = null;
    }
  }
}

/**
 * Publishes an event to Postgres, which will broadcast it to ALL worker processes.
 */
export async function publishSyncEvent(documentId: string, payload: any) {
  // Use a temporary client for publishing so we don't block the listener
  const publishClient = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await publishClient.connect();
    
    // Package the data
    const message = JSON.stringify({ documentId, payload });
    
    // NOTIFY payload size limit is 8000 bytes. If it's too big, we just skip pubsub 
    // and let the 2-second DB polling fallback catch it.
    if (Buffer.byteLength(message, 'utf8') < 7900) {
      await publishClient.query('SELECT pg_notify($1, $2)', ['sync_updates', message]);
    } else {
      console.warn('[PubSub] Payload too large for NOTIFY, falling back to DB polling');
      // We can still emit locally for this specific worker just in case!
      sseEmitter.emit(`doc:${documentId}`, payload);
    }
  } catch (error) {
    console.error('[PubSub] Failed to publish event', error);
  } finally {
    await publishClient.end().catch(() => {});
  }
}
