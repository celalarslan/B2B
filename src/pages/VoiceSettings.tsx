import React, { useState, useRef } from 'react';
import { Mic, Phone, Save, Play, Square } from 'lucide-react';

const VoiceSettings = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [forwardingNumber, setForwardingNumber] = useState('');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSave = async () => {
    if (!audioBlob || !forwardingNumber) return;

    try {
      // Here we would typically upload the audio file and save the forwarding number
      // For now, we'll just show a success message
      alert('Voice settings saved successfully!');
    } catch (error) {
      console.error('Error saving voice settings:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Voice Settings</h1>

      {/* Call Forwarding Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Call Forwarding</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forward calls to:
            </label>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="tel"
                  value={forwardingNumber}
                  onChange={(e) => setForwardingNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-2 border rounded-md focus:ring-[#9d00ff] focus:border-[#9d00ff]"
                />
              </div>
              <Phone className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Voice Recording Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Custom Voice</h2>
        <div className="space-y-6">
          <p className="text-gray-600">
            Record your voice to personalize your AI assistant's responses.
          </p>

          <div className="flex items-center space-x-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center space-x-2 px-4 py-2 bg-[#9d00ff] text-white rounded-md hover:bg-[#8400d6] transition-colors"
              >
                <Mic className="w-5 h-5" />
                <span>Start Recording</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                <Square className="w-5 h-5" />
                <span>Stop Recording</span>
              </button>
            )}

            {audioUrl && (
              <audio controls src={audioUrl} className="flex-1" />
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-6 py-2 bg-[#9d00ff] text-white rounded-md hover:bg-[#8400d6] transition-colors"
        >
          <Save className="w-5 h-5" />
          <span>Save Settings</span>
        </button>
      </div>
    </div>
  );
};

export default VoiceSettings;