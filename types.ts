
export enum Theme {
  ISLAMIC = 'ISLAMIC',
  TURKISH = 'TURKISH',
  DARK = 'DARK'
}

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
export type VoicePreference = 'Male' | 'Female' | 'Robotic';

export interface Attachment {
  base64: string;
  mimeType: string;
  name: string;
}

export interface Command {
  action: string;
  params: Record<string, any>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  orchestration?: OrchestrationResult;
  usedModel?: string;
  nodeDistribution?: Record<string, number>;
  sources?: any[];
  attachment?: Attachment;
  imageResponse?: string; // Base64 image URL
}

export interface OrchestrationResult {
  simulatedResponses: {
    model: string;
    summary: string;
  }[];
  finalSynthesis: string;
  estimatedTime?: string;
  commands?: Command[];
  toolCalls?: any[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  isPinned: boolean;
  lastUpdate: number;
}
