export interface BlockData {
  id: string;
  documentId: string;
  type: string;
  content: string;
  index: string;
  version: number;
  clientId: string;
  clientTimestamp: number;
  deleted: boolean;
}

export interface SyncOperation {
  id: string;
  documentId: string;
  action: 'UPDATE_BLOCK';
  payload: BlockData;
  timestamp: number;
}

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

export interface Snapshot {
  id: string;
  documentId: string;
  name: string;
  data: string;
  createdAt: string;
}
