import { act } from '@testing-library/react';
import { useUserChatStore } from '../../src/store/userChatStore';
import { sendSupportEmail } from '../../src/lib/sendSupportEmail';
import { logConversation } from '../../src/lib/supabase';

// Mock dependencies
jest.mock('../../src/lib/sendSupportEmail', () => ({
  sendSupportEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
  getCurrentUser: jest.fn().mockResolvedValue(null),
  logConversation: jest.fn().mockResolvedValue(undefined),
}));

// Mock fetch for OpenAI API calls
global.fetch = jest.fn().mockImplementation((url) => {
  if (url.includes('openai.com')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'AI response' } }],
      }),
    });
  }
  
  if (url.includes('elevenlabs.io')) {
    return Promise.resolve({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    });
  }
  
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  });
});

describe('userChatStore', () => {
  beforeEach(() => {
    // Clear the store before each test
    act(() => {
      useUserChatStore.getState().resetConversation();
    });
    
    jest.clearAllMocks();
  });

  test('initializes with default state', () => {
    const state = useUserChatStore.getState();
    
    expect(state.messages).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.isCollectingUserInfo).toBe(false);
    expect(state.userInfo).toBeNull();
    expect(state.isPlayingAudio).toBe(false);
  });

  test('addMessage adds a message to the store', () => {
    const { addMessage } = useUserChatStore.getState();
    
    act(() => {
      addMessage('Test message', 'user');
    });
    
    const { messages } = useUserChatStore.getState();
    
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Test message');
    expect(messages[0].role).toBe('user');
    expect(messages[0].id).toBeDefined();
    expect(messages[0].timestamp).toBeInstanceOf(Date);
  });

  test('sendMessage adds user message and calls OpenAI API', async () => {
    const { sendMessage } = useUserChatStore.getState();
    
    await act(async () => {
      await sendMessage('Hello AI');
    });
    
    const { messages, isLoading, error } = useUserChatStore.getState();
    
    // Check that user message was added
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('Hello AI');
    expect(messages[0].role).toBe('user');
    
    // Check that AI response was added
    expect(messages[1].content).toBe('AI response');
    expect(messages[1].role).toBe('assistant');
    
    // Check that loading state was reset
    expect(isLoading).toBe(false);
    expect(error).toBeNull();
    
    // Check that fetch was called with the right parameters
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-openai-key',
        }),
      })
    );
  });

  test('handles API errors during sendMessage', async () => {
    // Mock fetch to reject
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('API error'));
    
    const { sendMessage } = useUserChatStore.getState();
    
    await act(async () => {
      await sendMessage('Hello AI');
    });
    
    const { messages, isLoading, error } = useUserChatStore.getState();
    
    // Check that user message was added
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Hello AI');
    expect(messages[0].role).toBe('user');
    
    // Check that error state was set
    expect(isLoading).toBe(false);
    expect(error).toBe('API error');
  });

  test('startCollectingUserInfo sets the collecting state', () => {
    const { startCollectingUserInfo } = useUserChatStore.getState();
    
    act(() => {
      startCollectingUserInfo();
    });
    
    const { isCollectingUserInfo, userInfo } = useUserChatStore.getState();
    
    expect(isCollectingUserInfo).toBe(true);
    expect(userInfo).toBeNull();
  });

  test('setUserInfo updates user info state', () => {
    const { setUserInfo } = useUserChatStore.getState();
    
    act(() => {
      setUserInfo({ name: 'Test User' });
    });
    
    const { userInfo } = useUserChatStore.getState();
    
    expect(userInfo).toEqual({ name: 'Test User', email: '' });
    
    // Update with email
    act(() => {
      setUserInfo({ email: 'test@example.com' });
    });
    
    const updatedUserInfo = useUserChatStore.getState().userInfo;
    
    expect(updatedUserInfo).toEqual({ name: 'Test User', email: 'test@example.com' });
  });

  test('submitSupportRequest sends email and adds confirmation message', async () => {
    const { setUserInfo, startCollectingUserInfo, addMessage, submitSupportRequest } = useUserChatStore.getState();
    
    // Set up user info and messages
    act(() => {
      startCollectingUserInfo();
      setUserInfo({ name: 'Test User', email: 'test@example.com' });
      addMessage('I need help', 'user');
      addMessage('What do you need help with?', 'assistant');
    });
    
    await act(async () => {
      await submitSupportRequest();
    });
    
    // Check that sendSupportEmail was called with the right parameters
    expect(sendSupportEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test User',
        email: 'test@example.com',
        issue: expect.any(String),
        transcript: expect.any(String),
      })
    );
    
    const { messages, isCollectingUserInfo } = useUserChatStore.getState();
    
    // Check that confirmation message was added
    expect(messages[messages.length - 1].role).toBe('assistant');
    expect(messages[messages.length - 1].content).toContain('Thank you');
    
    // Check that collecting state was reset
    expect(isCollectingUserInfo).toBe(false);
  });

  test('handles errors during submitSupportRequest', async () => {
    // Mock sendSupportEmail to reject
    (sendSupportEmail as jest.Mock).mockRejectedValueOnce(new Error('Email error'));
    
    const { setUserInfo, startCollectingUserInfo, addMessage, submitSupportRequest } = useUserChatStore.getState();
    
    // Set up user info and messages
    act(() => {
      startCollectingUserInfo();
      setUserInfo({ name: 'Test User', email: 'test@example.com' });
      addMessage('I need help', 'user');
    });
    
    await act(async () => {
      await submitSupportRequest();
    });
    
    const { error, messages } = useUserChatStore.getState();
    
    // Check that error state was set
    expect(error).toBe('Email error');
    
    // Check that error message was added
    expect(messages[messages.length - 1].role).toBe('assistant');
    expect(messages[messages.length - 1].content).toContain('sorry');
  });

  test('summarizeConversation returns appropriate summary', () => {
    const { addMessage, summarizeConversation } = useUserChatStore.getState();
    
    // Add some messages
    act(() => {
      addMessage('Hello', 'user');
      addMessage('Hi there', 'assistant');
      addMessage('I need help with my account', 'user');
    });
    
    const summary = summarizeConversation();
    
    // Should use the help request message
    expect(summary).toBe('I need help with my account');
    
    // Reset and try with a short conversation
    act(() => {
      useUserChatStore.getState().resetConversation();
      addMessage('Hello', 'user');
    });
    
    const shortSummary = summarizeConversation();
    
    // Should use the only user message
    expect(shortSummary).toBe('Hello');
  });

  test('logConversationToSupabase calls the logging function', async () => {
    const { addMessage, logConversationToSupabase } = useUserChatStore.getState();
    
    // Add some messages
    act(() => {
      addMessage('Hello', 'user');
      addMessage('Hi there', 'assistant');
    });
    
    await act(async () => {
      await logConversationToSupabase();
    });
    
    // Check that logConversation was called
    expect(logConversation).toHaveBeenCalled();
  });

  test('resetConversation clears all state', () => {
    const { addMessage, setUserInfo, startCollectingUserInfo, resetConversation } = useUserChatStore.getState();
    
    // Set up some state
    act(() => {
      addMessage('Hello', 'user');
      startCollectingUserInfo();
      setUserInfo({ name: 'Test User' });
    });
    
    // Reset the conversation
    act(() => {
      resetConversation();
    });
    
    const state = useUserChatStore.getState();
    
    // Check that all state was reset
    expect(state.messages).toEqual([]);
    expect(state.isCollectingUserInfo).toBe(false);
    expect(state.userInfo).toBeNull();
    expect(state.error).toBeNull();
  });
});