/**
 * Aurora Type Definitions
 * Data contracts for multimodal journaling, distinct agent outputs, user controls, and companion state.
 */

export type InputModality = 'text' | 'voice' | 'multimodal';

export type EmotionalValence = 'positive' | 'neutral' | 'reflective' | 'challenging' | 'mixed';

export type ActionCategory = 'planning' | 'rest' | 'communication' | 'learning' | 'movement' | 'organization' | 'other';

export type ActionEffort = '5 minutes' | '15 minutes' | '30 minutes' | 'longer';

export type ActionStatus = 'pending' | 'accepted' | 'completed' | 'dismissed' | 'none';

export type EntryStatus = 'saved' | 'analyzing' | 'analyzed' | 'unavailable' | 'failed';

export interface ActionItem {
  action: string;
  reason: string;
  effort: ActionEffort;
  category: ActionCategory;
  requires_confirmation: boolean;
}

export interface MoodSignalResult {
  mood: string;
  confidence: number;
  topics: string[];
  concern_flag: boolean;
  emotional_valence: EmotionalValence;
  intensity: 'low' | 'moderate' | 'high';
  explanation_evidence?: {
    word_count: number;
    detected_themes: string[];
    sentiment_balance: string;
    correction_applied?: boolean;
  };
}

export interface ReflectionResult {
  reflection: string;
  is_supportive_crisis?: boolean;
}

export interface JournalEntry {
  id: string;
  ownerId: string;
  userId: string;
  content: string;
  rawText?: string;
  imageUrl?: string;
  hasImage: boolean;
  source: InputModality;
  mood?: string;
  confidence?: number;
  topics?: string[];
  concern_flag?: boolean;
  emotional_valence?: EmotionalValence;
  intensity?: 'low' | 'moderate' | 'high';
  reflection?: string;
  action?: ActionItem | null;
  actionStatus: ActionStatus;
  userMoodOverride?: string;
  isExcludedFromDigest?: boolean;
  editedByUser?: boolean;
  status: EntryStatus;
  analysisStatus?: 'pending' | 'available' | 'unavailable';
  reflectionStatus?: 'available' | 'unavailable';
  createdAt: string;
  updatedAt: string;
  evidenceSummary?: {
    wordCount: number;
    keyThemes: string[];
    confidenceLabel: 'high' | 'medium' | 'low';
    correctedByUser: boolean;
  };
}

export interface MoodCorrection {
  id: string;
  userId: string;
  entryId: string;
  originalMood: string;
  correctedMood: string;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  petName: string;
  enablePhotoAnalysis: boolean;
  enableWeeklyPatterns: boolean;
  streakDays: number;
  lastReflectedDate?: string;
  completedActionsCount: number;
  updatedAt: string;
}

export type PetMood = 'joyful' | 'calm' | 'comforting' | 'celebrating';

export interface PetState {
  name: string;
  mood: PetMood;
  message: string;
  level: number;
}

export interface PatternEvidenceDetail {
  entriesCount: number;
  dateRange: string;
  repeatedTopics: string[];
  confidence: 'high' | 'medium' | 'low';
  userConfirmedCorrectionsUsed: boolean;
  explanationSummary: string;
  supportingEntryDates?: string[];
}

export interface WeeklyPatternItem {
  theme: string;
  frequency: number;
  entriesCount: number;
  dateRange: string;
  observation: string;
  supportingEntryIds?: string[];
  evidenceCitation?: string;
  evidenceDetails?: PatternEvidenceDetail;
}

export interface WeeklyInsightResult {
  period: string;
  totalEntriesAnalyzed: number;
  dominantMoods: Array<{ mood: string; count: number; percentage: number }>;
  patterns: WeeklyPatternItem[];
  encouragement: string;
  evidenceDisclaimer: string;
  overview?: string;
  timeframe?: string;
  forwardSuggestion?: string;
}

export interface CrisisResource {
  name: string;
  contact: string;
  description: string;
  badge: string;
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: '988 Suicide & Crisis Lifeline',
    contact: 'Call or Text 988',
    description: 'Free, confidential support available 24/7 in the US and Canada.',
    badge: '24/7 Toll-Free'
  },
  {
    name: 'Crisis Text Line',
    contact: 'Text HOME to 741741',
    description: 'Connect with a crisis counselor 24/7 across the US, UK, and Canada.',
    badge: 'Text Support'
  },
  {
    name: 'International Befrienders Worldwide',
    contact: 'befrienders.org',
    description: 'Confidential emotional support worldwide for anyone experiencing distress.',
    badge: 'Global'
  },
  {
    name: 'The Trevor Project (LGBTQ+ Youth)',
    contact: 'Call 1-866-488-7386 or Text START to 678-678',
    description: '24/7 confidential crisis intervention and suicide prevention services.',
    badge: '24/7 Support'
  }
];
