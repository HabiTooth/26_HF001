export interface HistoryItem {
  sessionId?: number | null;
  date: string;
  time: string;
  score: number;
  grade: string;
}

export interface HistoryListSectionProps {
  items: HistoryItem[];
}
