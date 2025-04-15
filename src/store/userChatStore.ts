import { create } from 'zustand';
import { getUserSystemPrompt } from '../lib/ai/userSystemPrompt';
import { logConversation } from '../lib/supabase';
import { sendSupportEmail } from '../lib/sendSupportEmail';
import { ChatState, Message, UserInfo } from '../types/chat';
import { v4 as uuidv4 } from 'uuid';

interface UserChatStore extends ChatState {
  addMessage: (content: string, role: 'user' | 'assistant') => void;
  sendMessage: (content: string) => Promise<void>;
  resetConversation: () => void;
  startCollectingUserInfo: () => void;
  setUserInfo: (info: Partial<UserInfo>) => void;
  submitSupportRequest: () => Promise<void>;
  setIsPlayingAudio: (isPlaying: boolean) => void;
  summarizeConversation: () => string;
  logConversationToSupabase: () => Promise<void>;
  generateSpeech: (text: string) => Promise<void>;
}

export const useUserChatStore = create<UserChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  isCollectingUserInfo: false,
  userInfo: null,
  isPlayingAudio: false,

  addMessage: (content, role) => {
    const newMessage: Message = {
      id: uuidv4(),
      content,
      role,
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  sendMessage: async (content) => {
    const { addMessage, isCollectingUserInfo, userInfo } = get();
    
    // Add user message
    addMessage(content, 'user');
    
    // If we're collecting user info, handle that flow
    if (isCollectingUserInfo) {
      if (!userInfo || !userInfo.name) {
        // Collecting name
        set({ userInfo: { name: content, email: '' } });
        addMessage(`Thanks ${content}! Now, please provide your email address so we can follow up with you.`, 'assistant');
        return;
      } else if (!userInfo.email) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(content)) {
          set({ userInfo: { ...userInfo, email: content } });
          addMessage(`Thank you! We'll be in touch at ${content} soon. Is there anything else you'd like to add about your issue?`, 'assistant');
          
          // After collecting email, we can consider the collection complete
          setTimeout(() => {
            set({ isCollectingUserInfo: false });
          }, 1000);
        } else {
          addMessage("That doesn't look like a valid email address. Please provide a valid email so we can contact you.", 'assistant');
        }
        return;
      }
    }
    
    // Regular message handling
    set({ isLoading: true, error: null });
    
    try {
      // Get current language
      const lang = document.documentElement.lang || 'en';
      
      // Prepare conversation history for context
      const conversationHistory = get().messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: getUserSystemPrompt(lang)
            },
            ...conversationHistory,
            { role: 'user', content }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      // Check if the response indicates we should collect user info
      if (
        aiResponse.includes("I'd be happy to connect you") ||
        aiResponse.includes("I'll need your contact information") ||
        aiResponse.includes("Could you provide your name") ||
        aiResponse.includes("I'll need to get some information from you")
      ) {
        set({ isCollectingUserInfo: true });
      }
      
      // Add AI response
      addMessage(aiResponse, 'assistant');
      
      // Log conversation to Supabase
      get().logConversationToSupabase();
    } catch (error) {
      console.error('Error getting AI response:', error);
      set({ error: error instanceof Error ? error.message : 'An error occurred' });
      addMessage("I'm sorry, I'm having trouble connecting right now. Please try again later.", 'assistant');
    } finally {
      set({ isLoading: false });
    }
  },

  resetConversation: () => {
    set({
      messages: [],
      isLoading: false,
      error: null,
      isCollectingUserInfo: false,
      userInfo: null,
      isPlayingAudio: false,
    });
  },

  startCollectingUserInfo: () => {
    set({ isCollectingUserInfo: true });
  },

  setUserInfo: (info) => {
    set((state) => ({
      userInfo: {
        name: info.name !== undefined ? info.name : state.userInfo?.name || '',
        email: info.email !== undefined ? info.email : state.userInfo?.email || '',
        country: info.country !== undefined ? info.country : state.userInfo?.country,
        company: info.company !== undefined ? info.company : state.userInfo?.company,
      }
    }));
  },

  submitSupportRequest: async () => {
    const { messages, userInfo, addMessage } = get();
    
    if (!userInfo || !userInfo.name || !userInfo.email) {
      addMessage("I need your name and email to submit a support request. Could you please provide them?", 'assistant');
      set({ isCollectingUserInfo: true });
      return;
    }
    
    set({ isLoading: true });
    
    try {
      // Prepare transcript
      const transcript = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');
      
      // Get the issue from the conversation
      const issue = get().summarizeConversation();
      
      // Send support email
      await sendSupportEmail({
        name: userInfo.name,
        email: userInfo.email,
        country: userInfo.country,
        company: userInfo.company,
        issue,
        transcript
      });
      
      // Add confirmation message
      addMessage(`Thank you for your request, ${userInfo.name}. Our support team will contact you at ${userInfo.email} as soon as possible.`, 'assistant');
      
      // Reset collecting state
      set({ isCollectingUserInfo: false });
    } catch (error) {
      console.error('Error submitting support request:', error);
      set({ error: error instanceof Error ? error.message : 'An error occurred' });
      addMessage("I'm sorry, there was an error submitting your support request. Please try again later.", 'assistant');
    } finally {
      set({ isLoading: false });
    }
  },

  setIsPlayingAudio: (isPlaying) => {
    set({ isPlayingAudio: isPlaying });
  },

  summarizeConversation: () => {
    const { messages } = get();
    
    // Get user messages only
    const userMessages = messages.filter(m => m.role === 'user');
    
    if (userMessages.length === 0) {
      return "No user messages found";
    }
    
    // Try to find a message that looks like a help request
    const helpRequest = userMessages.find(m => 
      m.content.toLowerCase().includes('help') || 
      m.content.toLowerCase().includes('issue') || 
      m.content.toLowerCase().includes('problem') ||
      m.content.toLowerCase().includes('support')
    );
    
    // If found, use that as the summary
    if (helpRequest) {
      return helpRequest.content;
    }
    
    // Otherwise use the most recent user message
    return userMessages[userMessages.length - 1].content;
  },

  logConversationToSupabase: async () => {
    const { messages } = get();
    
    // Only log if there are at least 2 messages (a conversation)
    if (messages.length < 2) return;
    
    try {
      await logConversation(messages);
    } catch (error) {
      console.error('Error logging conversation:', error);
      // Don't set error state as this is a non-critical operation
    }
  },

  generateSpeech: async (text) => {
    // Skip if text is empty
    if (!text.trim()) return;
    
    try {
      // Set playing state
      set({ isPlayingAudio: true });
      
      // Get the current language
      const currentLang = document.documentElement.lang || 'en';
      
      // Get the appropriate voice ID based on language
      let voiceId = '';
      switch (currentLang) {
        case 'tr':
          voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID_TR;
          break;
        case 'ar':
          voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID_AR;
          break;
        case 'fr':
          voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID_FR;
          break;
        default: // English
          voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID_EN;
      }
      
      // Skip if no voice ID is available
      if (!voiceId) {
        set({ isPlayingAudio: false });
        return;
      }
      
      // Call ElevenLabs API
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }
      
      // Create audio element and play
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        set({ isPlayingAudio: false });
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        console.error('Audio playback error');
        set({ isPlayingAudio: false });
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
      
    } catch (error) {
      console.error('Error generating speech:', error);
      set({ isPlayingAudio: false });
    }
  }
}));