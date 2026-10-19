export type DetectionClass = 'normal' | 'plaque' | 'calculus' | 'combine';

export interface DetectionResult {
  class: DetectionClass;
  confidence: number;
  bbox: [number, number, number, number];
  segmentMask?: number[][];
}

export interface ScanReport {
  scanId: string;
  score: number;
  detections: DetectionResult[];
  llmGuide: string;
  createdAt: string;
}
