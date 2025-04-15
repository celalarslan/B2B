import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendSupportEmail } from '../lib/sendSupportEmail';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface UserInfo {
  name: string;
  email: string;
  country: string;
  company: string;
  issue: string;
}

type ConversationState = 
  | 'greeting'
  | 'asking_name'
  | 'asking_email'
  | 'asking_country'
  | 'asking_company'
  | 'asking_issue'
  | 'confirming'
  | 'completed'
  | 'error';

const SupportChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>('greeting');
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    email: '',
    country: '',
    company: '',
    issue: '',
  });
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start conversation when component mounts
  useEffect(() => {
    const initialMessage: Message = {
      id: Date.now().toString(),
      text: "👋 Hello! I'm your AI support assistant. I'm here to help you with any issues you're experiencing. To get started, could you please tell me your name?",
      sender: 'bot',
      timestamp: new Date(),
    };
    
    setMessages([initialMessage]);
    setConversationState('asking_name');
  }, []);

  // Generate a unique ID for messages
  const generateId = (): string => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Add a new message to the chat
  const addMessage = (text: string, sender: 'user' | 'bot'): void => {
    const newMessage: Message = {
      id: generateId(),
      text,
      sender,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  // Process user input based on current conversation state
  const processUserInput = (input: string): void => {
    addMessage(input, 'user');
    setIsLoading(true);
    
    // Simulate AI thinking time
    setTimeout(() => {
      let botResponse = '';
      let nextState: ConversationState = conversationState;
      
      switch (conversationState) {
        case 'asking_name':
          setUserInfo(prev => ({ ...prev, name: input }));
          botResponse = `Nice to meet you, ${input}! Could you please provide your email address so we can follow up with you if needed?`;
          nextState = 'asking_email';
          break;
          
        case 'asking_email':
          // Simple email validation
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
            botResponse = "That doesn't look like a valid email address. Could you please provide a valid email?";
          } else {
            setUserInfo(prev => ({ ...prev, email: input }));
            botResponse = "Thanks! Which country are you located in?";
            nextState = 'asking_country';
          }
          break;
          
        case 'asking_country':
          setUserInfo(prev => ({ ...prev, country: input }));
          botResponse = "Great! What company or organization are you with?";
          nextState = 'asking_company';
          break;
          
        case 'asking_company':
          setUserInfo(prev => ({ ...prev, company: input }));
          botResponse = "Thank you. Now, please describe the issue you're experiencing in as much detail as possible.";
          nextState = 'asking_issue';
          break;
          
        case 'asking_issue':
          setUserInfo(prev => ({ ...prev, issue: input }));
          botResponse = `Thanks for providing all that information. Here's what I've got:
          
Name: ${userInfo.name}
Email: ${userInfo.email}
Country: ${userInfo.country}
Company: ${userInfo.company}
Issue: ${input}

Is this information correct? I'll send this to our support team who will get back to you as soon as possible.`;
          nextState = 'confirming';
          break;
          
        case 'confirming':
          if (input.toLowerCase().includes('yes') || input.toLowerCase().includes('correct') || input.toLowerCase().includes('right')) {
            botResponse = "Great! I'm sending your information to our support team now. They'll contact you at the email address you provided as soon as possible.";
            nextState = 'completed';
            submitSupportRequest();
          } else {
            botResponse = "I understand. Let's start over. What's your name?";
            nextState = 'asking_name';
            setUserInfo({
              name: '',
              email: '',
              country: '',
              company: '',
              issue: '',
            });
          }
          break;
          
        case 'completed':
          botResponse = "Your request has already been submitted. Is there anything else I can help you with?";
          break;
          
        default:
          botResponse = "I'm sorry, I didn't understand that. Could you please try again?";
      }
      
      addMessage(botResponse, 'bot');
      setConversationState(nextState);
      setIsLoading(false);
    }, 1000);
  };

  // Submit the support request via email
  const submitSupportRequest = async (): Promise<void> => {
    setEmailStatus('sending');
    
    try {
      // Compile the full conversation transcript
      const transcript = messages.map(msg => 
        `[${msg.timestamp.toLocaleString()}] ${msg.sender === 'user' ? userInfo.name : 'AI Assistant'}: ${msg.text}`
      ).join('\n\n');
      
      // Send the email
      await sendSupportEmail({
        name: userInfo.name,
        email: userInfo.email,
        country: userInfo.country,
        company: userInfo.company,
        issue: userInfo.issue,
        transcript
      });
      
      setEmailStatus('success');
      addMessage("✅ Your support request has been successfully sent to our team. We'll get back to you as soon as possible at " + userInfo.email, 'bot');
    } catch (error) {
      console.error('Error sending support email:', error);
      setEmailStatus('error');
      addMessage("❌ I'm sorry, there was an error sending your support request. Please try again later or contact us directly at support@b2bcallassistant.com.", 'bot');
      setConversationState('error');
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;
    
    processUserInput(inputValue.trim());
    setInputValue('');
    
    // Focus the input field after submission
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[600px] max-w-md mx-auto border border-gray-200 rounded-lg shadow-lg bg-white">
      {/* Chat Header */}
      <div className="bg-primary text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">AI Support Assistant</h2>
        <p className="text-sm opacity-80">Get help with your questions</p>
      </div>
      
      {/* Messages Container */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex mb-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  message.sender === 'user' ? 'bg-primary text-white ml-2' : 'bg-gray-200 text-gray-600 mr-2'
                }`}>
                  {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-3 rounded-lg ${
                  message.sender === 'user' 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 rounded-tl-none shadow-sm'
                }`}>
                  <p className="whitespace-pre-line">{message.text}</p>
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
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 text-gray-600 mr-2 flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="p-3 rounded-lg bg-white text-gray-800 rounded-tl-none shadow-sm">
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Email status indicators */}
        {emailStatus === 'sending' && (
          <div className="flex justify-center my-2">
            <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm flex items-center">
              <Loader2 size={14} className="animate-spin mr-1" />
              Sending your request...
            </div>
          </div>
        )}
        
        {emailStatus === 'success' && (
          <div className="flex justify-center my-2">
            <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-sm flex items-center">
              <CheckCircle size={14} className="mr-1" />
              Request sent successfully!
            </div>
          </div>
        )}
        
        {emailStatus === 'error' && (
          <div className="flex justify-center my-2">
            <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-sm flex items-center">
              <XCircle size={14} className="mr-1" />
              Failed to send request
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isLoading || conversationState === 'completed' || emailStatus === 'sending'}
          />
          <button
            type="submit"
            className={`p-2 rounded-r-lg ${
              isLoading || !inputValue.trim() || conversationState === 'completed' || emailStatus === 'sending'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
            disabled={isLoading || !inputValue.trim() || conversationState === 'completed' || emailStatus === 'sending'}
          >
            <Send size={20} />
          </button>
        </div>
        
        {conversationState === 'completed' && emailStatus === 'success' && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Your support request has been submitted. Our team will contact you shortly.
          </p>
        )}
      </form>
    </div>
  );
};

export default SupportChat;