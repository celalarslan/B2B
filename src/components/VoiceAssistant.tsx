import React from 'react';
import { Mic } from 'lucide-react';

export default function VoiceAssistant() {
  return (
    <div className="bg-white py-16 lg:py-24">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <h2 className="text-center text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Experience the future of customer service
          </h2>
          <p className="mt-4 max-w-3xl mx-auto text-center text-xl text-gray-500">
            Our AI voice assistant technology provides natural, human-like interactions that keep your customers satisfied and your business running smoothly.
          </p>
        </div>

        <div className="relative mt-12 lg:mt-24 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
          <div className="relative">
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">
              Advanced voice technology
            </h3>
            <p className="mt-3 text-lg text-gray-500">
              Powered by cutting-edge AI, our voice assistants understand context, handle complex conversations, and learn from each interaction to provide better service.
            </p>

            <dl className="mt-10 space-y-10">
              {[
                {
                  name: 'Natural Language Processing',
                  description: 'Understanding context and intent for more natural conversations',
                },
                {
                  name: 'Voice Recognition',
                  description: 'Accurate speech recognition in multiple languages and accents',
                },
                {
                  name: 'Continuous Learning',
                  description: 'AI that improves with each interaction for better customer service',
                },
              ].map((item) => (
                <div key={item.name} className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                      <Mic className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{item.name}</p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">{item.description}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-10 -mx-4 relative lg:mt-0">
            <div className="relative space-y-4">
              {/* Placeholder for voice assistant demo or illustration */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-8 text-white text-center">
                <Mic className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg font-semibold">Try our demo</p>
                <p className="mt-2">Experience the power of AI voice assistance firsthand</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}