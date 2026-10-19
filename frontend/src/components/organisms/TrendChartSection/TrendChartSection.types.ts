export interface TrendDataPoint {
  date: string;
  score: number;
}

export interface TrendChange {
  delta: number | null;
  previousDate: string;
  improved: number;
  worsened: number;
  summary: string;
}

export interface TrendChartSectionProps {
  data: TrendDataPoint[];
  change?: TrendChange | null;
}