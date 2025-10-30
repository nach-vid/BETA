
import { subDays } from "date-fns";

export type Emotion = '😊' | '😐' | '😟' | '😤' | '🤩';

export interface Trade {
  id: string;
  date: Date;
  instrument: string;
  profitOrLoss: number;
  notes: string;
  emotion: Emotion;
}

export interface JournalEntry {
  id: string;
  date: Date;
  content: string;
  emotion: Emotion;
}
