import React from 'react';
import { Phone, MessageSquare, Mic, Building2 } from 'lucide-react';

const features = [
  {
    name: 'Automated Call Handling',
    description: 'Let AI handle your incoming calls 24/7, ensuring no customer goes unattended.',
    icon: Phone,
  },
  {
    name: 'Natural Conversations',
    description: 'Advanced language processing for human-like interactions with your customers.',
    icon: MessageSquare,
  },
  {
    name: 'Custom Voice Selection',
    description: 'Choose from a variety of voices to match your brand identity perfectly.',
    icon: Mic,
  },
  {
    name: 'Business Integration',
    description: 'Seamlessly integrate with your existing business processes and systems.',
    icon: Building2,
  },
];

export default function Features() {
  return (
    <div className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Features</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need for voice automation
          </p>
        </div>

        <div className="mt-10">
          <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
            {features.map((feature) => (
              <div key={feature.name} className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{feature.name}</p>
                <p className="mt-2 ml-16 text-base text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}