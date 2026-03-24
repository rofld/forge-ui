export interface WBNode {
  id: string;
  type: 'note' | 'file' | 'heading';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color?: string;
  filePath?: string;
}
