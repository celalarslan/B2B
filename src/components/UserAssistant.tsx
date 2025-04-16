import React, { useState, useRef, useEffect } from 'react';
import { Mic, X, Loader2, MessageSquare, Send, User, Bot, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUserChatStore } from '../store/userChatStore';

interface UserAssistantProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  initialMessage?: string;
  theme?: 'dark' | 'light' | 'purple';
}

const UserAssistant: React.FC<UserAssistantProps> = ({ 
  position = 'bottom-right',
  initialMessage = "👋 Hello! I'm your AI assistant. How can I help you understand our call forwarding service today?",
  theme = 'purple'
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  
  const { 
    messages, 
    isLoading, 
    error, 
    isPlayingAudio,
    isCollectingUserInfo,
    userInfo,
    addMessage, 
    sendMessage, 
    resetConversation,
    setIsPlayingAudio
  } = useUserChatStore();
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'light':
        return {
          primary: 'bg-blue-500 hover:bg-blue-600',
          secondary: 'bg-white',
          text: 'text-gray-800',
          headerBg: 'bg-blue-500',
          headerText: 'text-white',
          inputBg: 'bg-gray-100',
          messageBg: 'bg-blue-500',
          messageText: 'text-white',
          botMessageBg: 'bg-gray-200',
          botMessageText: 'text-gray-800',
          border: 'border-gray-200'
        };
      case 'dark':
        return {
          primary: 'bg-gray-800 hover:bg-gray-700',
          secondary: 'bg-gray-900',
          text: 'text-white',
          headerBg: 'bg-gray-800',
          headerText: 'text-white',
          inputBg: 'bg-gray-800',
          messageBg: 'bg-gray-700',
          messageText: 'text-white',
          botMessageBg: 'bg-gray-800',
          botMessageText: 'text-white',
          border: 'border-gray-700'
        };
      default: // purple
        return {
          primary: 'bg-purple-600 hover:bg-purple-700',
          secondary: 'bg-black',
          text: 'text-white',
          headerBg: 'bg-purple-600',
          headerText: 'text-white',
          inputBg: 'bg-gray-800',
          messageBg: 'bg-purple-600',
          messageText: 'text-white',
          botMessageBg: 'bg-gray-800',
          botMessageText: 'text-white',
          border: 'border-gray-800'
        };
    }
  };
  
  const colors = getThemeColors();

  // Get position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-6 left-6';
      case 'top-right':
        return 'top-6 right-6';
      case 'top-left':
        return 'top-6 left-6';
      default: // bottom-right
        return 'bottom-6 right-6';
    }
  };

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start conversation when chat is opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addMessage(initialMessage, 'assistant');
    }
  }, [isOpen, messages.length, addMessage, initialMessage]);

  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Generate speech for new assistant messages
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !isMuted) {
      useUserChatStore.getState().generateSpeech(messages[messages.length - 1].content);
    }
  }, [messages, isMuted]);

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        await processAudioInput(audioBlob);
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      addMessage("I couldn't access your microphone. Please check your permissions or type your message instead.", 'assistant');
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      
      // Stop all tracks in the stream
      if (mediaRecorder.current.stream) {
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  // Process recorded audio
  const processAudioInput = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      
      // Create form data for the audio file
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');
      formData.append('model', 'whisper-1');
      
      // Call OpenAI Whisper API for speech-to-text
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }
      
      const data = await response.json();
      const transcribedText = data.text;
      
      // Process the transcribed text
      if (transcribedText && transcribedText.trim()) {
        await sendMessage(transcribedText);
      } else {
        addMessage("I couldn't detect any speech. Please try again or type your message.", 'assistant');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      addMessage("I had trouble understanding that. Could you please try again or type your message?", 'assistant');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;
    
    await sendMessage(inputValue.trim());
    setInputValue('');
    
    // Focus the input field after submission
    inputRef.current?.focus();
  };

  // Toggle the chat window
  const toggleChat = () => {
    setIsOpen(prev => !prev);
    
    // If closing, reset the conversation
    if (isOpen) {
      resetConversation();
      setInputValue('');
      
      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setIsPlayingAudio(false);
    }
  };

  // Toggle mute state
  const toggleMute = () => {
    setIsMuted(prev => !prev);
    
    // If currently playing audio, stop it
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsPlayingAudio(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className={`fixed ${getPositionClasses()} p-4 rounded-full shadow-lg z-50 transition-colors ${
          isOpen ? 'bg-red-500 hover:bg-red-600' : `${colors.primary}`
        }`}
        aria-label={isOpen ? 'Close' : 'Get Help'}
      >
        {isOpen ? <X size={24} className="text-white" /> : <MessageSquare size={24} className="text-white" />}
      </button>
      
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed ${position === 'bottom-right' || position === 'bottom-left' ? 'bottom-24' : 'top-24'} ${
              position === 'bottom-right' || position === 'top-right' ? 'right-6' : 'left-6'
            } w-[350px] h-[500px] ${colors.secondary} rounded-lg shadow-xl z-50 flex flex-col overflow-hidden`}
          >
            {/* Chat Header */}
            <div className={`${colors.headerBg} ${colors.headerText} p-4 flex items-center justify-between`}>
              <div className="flex items-center">
                <MessageSquare className="mr-2" />
                <h3 className="font-medium">{t('assistant.title', 'AI Assistant')}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-gray-200 transition-colors"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button
                  onClick={toggleChat}
                  className="text-white hover:text-gray-200 transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {/* Messages Container */}
            <div className={`flex-1 p-4 overflow-y-auto ${colors.secondary}`}>
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' ? `${colors.messageBg} ml-2` : 'bg-gray-700 mr-2'
                      }`}>
                        {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                      </div>
                      <div className={`p-3 rounded-lg ${
                        message.role === 'user' 
                          ? `${colors.messageBg} ${colors.messageText} rounded-tr-none` 
                          : `${colors.botMessageBg} ${colors.botMessageText} rounded-tl-none`
                      }`}>
                        <p className="whitespace-pre-line text-sm">{message.content}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-start mb-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-700 mr-2 flex items-center justify-center">
                    <Bot size={16} />
                  </div>
                  <div className={`p-3 rounded-lg ${colors.botMessageBg} rounded-tl-none`}>
                    <div className="flex items-center space-x-1">
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Audio playing indicator */}
              {isPlayingAudio && !isMuted && (
                <div className="flex justify-center my-2">
                  <div className={`${colors.botMessageBg} px-3 py-1 rounded-full flex items-center space-x-1`}>
                    <div className="waveform-bar h-2 w-1 bg-purple-500 animate-waveform"></div>
                    <div className="waveform-bar h-2 w-1 bg-purple-500 animate-waveform" style={{ animationDelay: '0.1s' }}></div>
                    <div className="waveform-bar h-2 w-1 bg-purple-500 animate-waveform" style={{ animationDelay: '0.2s' }}></div>
                    <div className="waveform-bar h-2 w-1 bg-purple-500 animate-waveform" style={{ animationDelay: '0.3s' }}></div>
                    <div className="waveform-bar h-2 w-1 bg-purple-500 animate-waveform" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              
              {/* Error message */}
              {error && (
                <div className="bg-red-900 text-white p-3 rounded-lg mb-4">
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Area */}
            <div className={`p-3 border-t ${colors.border}`}>
              {/* Voice Input Button */}
              <div className="flex items-center mb-2">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                  className={`flex items-center justify-center w-full py-2 rounded-lg transition-colors ${
                    isRecording 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : isLoading
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : `${colors.primary} text-white`
                  }`}
                >
                  {isRecording ? (
                    <>
                      <X size={18} className="mr-2" />
                      {t('assistant.stopRecording', 'Stop Recording')}
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      {t('assistant.processing', 'Processing...')}
                    </>
                  ) : (
                    <>
                      <Mic size={18} className="mr-2" />
                      {t('assistant.startVoiceInput', 'Start Voice Input')}
                    </>
                  )}
                </button>
              </div>
              
              {/* Text Input */}
              <form onSubmit={handleSubmit} className="flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={isCollectingUserInfo 
                    ? t('assistant.enterInfo', 'Enter your information...') 
                    : t('assistant.typeMessage', 'Type your message...')}
                  className={`flex-1 p-2 ${colors.inputBg} ${colors.text} rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className={`p-2 rounded-r-lg ${
                    isLoading || !inputValue.trim()
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : `${colors.primary} text-white`
                  }`}
                  disabled={isLoading || !inputValue.trim()}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default UserAssistant;