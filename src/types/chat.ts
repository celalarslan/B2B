/**
 * Types for chat functionality
 */

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface UserInfo {
  name: string;
  email: string;
  country?: string;
  company?: string;
}

export interface SupportEmailData {
  name: string;
  email: string;
  issue: string;
  transcript: string;
  country?: string;
  company?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isCollectingUserInfo: boolean;
  userInfo: UserInfo | null;
  isPlayingAudio: boolean;
}

export interface EmailNotificationSettings {
  enabled: boolean;
  recipientEmail: string;
  sendTranscript: boolean;
  sendAudioLink: boolean;
  includeCustomerInfo: boolean;
  notifyOnMissedCalls: boolean;
  notifyOnCompletedCalls: boolean;
}