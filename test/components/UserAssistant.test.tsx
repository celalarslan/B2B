import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserAssistant from '../../src/components/UserAssistant';
import { useUserChatStore } from '../../src/store/userChatStore';

// Mock the userChatStore
jest.mock('../../src/store/userChatStore', () => ({
  useUserChatStore: jest.fn(),
}));

// Mock the MediaRecorder API
window.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: jest.fn(),
  onstop: jest.fn(),
  state: 'inactive',
  stream: {
    getTracks: () => [{
      stop: jest.fn()
    }]
  }
}));

describe('UserAssistant Component', () => {
  // Default mock implementation for the store
  const mockStore = {
    messages: [],
    isLoading: false,
    error: null,
    isPlayingAudio: false,
    isCollectingUserInfo: false,
    userInfo: null,
    addMessage: jest.fn(),
    sendMessage: jest.fn(),
    resetConversation: jest.fn(),
    setIsPlayingAudio: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useUserChatStore as jest.Mock).mockImplementation(() => mockStore);
  });

  test('renders the chat button correctly', () => {
    render(<UserAssistant />);
    
    // Check that the chat button is rendered
    const chatButton = screen.getByRole('button', { name: /get help/i });
    expect(chatButton).toBeInTheDocument();
  });

  test('opens chat window when button is clicked', () => {
    render(<UserAssistant />);
    
    // Click the chat button
    const chatButton = screen.getByRole('button', { name: /get help/i });
    fireEvent.click(chatButton);
    
    // Check that the chat window is opened
    expect(screen.getByText('assistant.title')).toBeInTheDocument();
  });

  test('adds initial message when chat is opened', () => {
    render(<UserAssistant initialMessage="Test initial message" />);
    
    // Click the chat button to open the chat
    const chatButton = screen.getByRole('button', { name: /get help/i });
    fireEvent.click(chatButton);
    
    // Check that addMessage was called with the initial message
    expect(mockStore.addMessage).toHaveBeenCalledWith('Test initial message', 'assistant');
  });

  test('displays messages from the store', () => {
    // Mock messages in the store
    (useUserChatStore as jest.Mock).mockImplementation(() => ({
      ...mockStore,
      messages: [
        { id: '1', role: 'assistant', content: 'Hello, how can I help?', timestamp: new Date() },
        { id: '2', role: 'user', content: 'I need help with forwarding', timestamp: new Date() },
      ],
    }));
    
    render(<UserAssistant />);
    
    // Open the chat
    const chatButton = screen.getByRole('button', { name: /get help/i });
    fireEvent.click(chatButton);
    
    // Check that messages are displayed
    expect(screen.getByText('Hello, how can I help?')).toBeInTheDocument();
    expect(screen.getByText('I need help with forwarding')).toBeInTheDocument();
  });

  test('sends message when form is submitted', async () => {
    render(<UserAssistant />);
    
    // Open the chat
    const chatButton = screen.getByRole('button', { name: /get help/i });
    fireEvent.click(chatButton);
    
    // Type a message
    const input = screen.getByPlaceholderText('assistant.typeMessage');
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    // Submit the form
    const form = input.closest('form');
    fireEvent.submit(form!);
    
    // Check that sendMessage was called with the input value
    expect(mockStore.sendMessage).toHaveBeenCalledWith('Test message');
    
    // Check that the input was cleared
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  test('starts recording when voice button is clicked', () => {
    // Mock getUserMedia
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      }),
    };
    
    render(<UserAssistant />);
    
    // Open the chat
    const chatButton = screen.getByRole('button', { name: /get help/i });
    fireEvent.click(chatButton);
    
    // Click the voice input button
    const voiceButton = screen.getByText('assistant.startVoiceInput');
    fireEvent.click(voiceButton);
    
    // Check that getUserMedia was called
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  test('shows loading state when processing message', () => {
    // Mock loading state
    (useUserChatStore as jest.Mock).mockImplementation(() => ({
      ...mockStore,
      isLoading: true,
    }));
    
    render(<UserAssistant />);
    
    // Open the chat
    const chatButton = screen.getByRole('button', { name: /get help/i });
    fireEvent.click(chatButton);
    
    // Check that the loading indicator is displayed
    expect(screen.getByText('assistant.processing')).toBeInTheDocument();
    
    // Check that the send button is disabled
    const sendButton = screen.getByRole('button', { name: '' }); // Send button has no text, just an icon
    expect(sendButton).toBeDisabled();
  });

  test('displays error message when there is an error', () => {
    // Mock error state
    (useUserChatStore as jest.Mock).mockImplementation(() => ({
      ...mockStore,
      error: 'Test error message',
    }));
    
    render(<UserAssistant />);
    
    // Open the chat
    const chatButton = screen.getByRole('button', { name: /get help/i });
    fireEvent.click(chatButton);
    
    // Check that the error message is displayed
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  test('toggles mute state when mute button is clicked', () => {
    render(<UserAssistant />);
    
    // Open the chat
    const chatButton = screen.getByRole('button', { name: /get help/i });
    fireEvent.click(chatButton);
    
    // Find and click the mute button
    const muteButton = screen.getByRole('button', { name: /mute/i });
    fireEvent.click(muteButton);
    
    // Check that the button now shows "Unmute"
    expect(screen.getByRole('button', { name: /unmute/i })).toBeInTheDocument();
  });

  test('resets conversation when chat is closed', () => {
    render(<UserAssistant />);
    
    // Open the chat
    const chatButton = screen.getByRole('button', { name: /get help/i });
    fireEvent.click(chatButton);
    
    // Close the chat
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Check that resetConversation was called
    expect(mockStore.resetConversation).toHaveBeenCalled();
  });

  test('renders with different position when specified', () => {
    render(<UserAssistant position="top-left" />);
    
    // Open the chat
    const chatButton = screen.getByRole('button', { name: /get help/i });
    fireEvent.click(chatButton);
    
    // Check that the chat window has the correct position classes
    const chatWindow = screen.getByText('assistant.title').closest('div');
    expect(chatWindow).toHaveClass('top-24', 'left-6');
  });

  test('renders with different theme when specified', () => {
    render(<UserAssistant theme="light" />);
    
    // Open the chat
    const chatButton = screen.getByRole('button', { name: /get help/i });
    fireEvent.click(chatButton);
    
    // Check that the chat window has the light theme
    const header = screen.getByText('assistant.title').closest('div');
    expect(header).toHaveClass('bg-blue-500');
  });
});