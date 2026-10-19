export interface ScoreCardProps {
  score: number | null;
  prevScore?: number;
  state?: 'loading' | 'ready' | 'error';
}
