export interface IDirectMessageEvent {
  id: string;
  content: string;
  tags: string[][];
  created_at: number;
  timestamp?: number;
  pubkey?: string;
  kind: number;
  address?: string;
}
