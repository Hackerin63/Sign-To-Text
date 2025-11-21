

export interface SignDetectionResult {
  isSign: boolean;
  translation: string;
  confidence: number;
  description?: string;
}

export interface HistoryItem {
  id: string;
  text: string;
  timestamp: number;
  mode: DetectionMode;
}

export enum AppState {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR'
}

export type DetectionMode = 'WORD' | 'SENTENCE';

export type SignLanguage = 'ASL' | 'ISL';

export interface User {
  id: string;
  name: string;
  email: string;
}
