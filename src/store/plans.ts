import { create } from 'zustand';
import { Plan } from '../types';

const plans: Plan[] = [
  {
    id: 'trial',
    name: 'Trial',
    price: 0,
    description: '1-month free trial to experience our AI assistant',
    features: [
      'Basic AI assistant',
      'Voice and text conversations',
      'Basic analytics',
      'Up to 100 conversations/month'
    ],
    isTrial: true
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 25,
    description: 'Perfect for small businesses starting with AI',
    features: [
      'Advanced AI assistant',
      'Voice and text conversations',
      'Basic analytics',
      'Up to 500 conversations/month',
      'Email support'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 75,
    description: 'For growing businesses needing more features',
    features: [
      'Premium AI assistant',
      'Voice and text conversations',
      'Advanced analytics',
      'Unlimited conversations',
      'Priority support',
      'Custom voice options',
      'Multiple business locations'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 500,
    description: 'Full-featured solution for large businesses',
    features: [
      'Enterprise AI assistant',
      'Voice and text conversations',
      'Advanced analytics & reporting',
      'Unlimited conversations',
      '24/7 priority support',
      'Custom voice options',
      'Multiple business locations',
      'API access',
      'Custom integrations',
      'Dedicated account manager'
    ]
  },
  {
    id: 'custom',
    name: 'Custom',
    price: 0,
    description: 'Contact us for a customized solution',
    features: [
      'All Enterprise features',
      'Custom development',
      'Custom pricing',
      'Custom SLA',
      'On-premise deployment options'
    ],
    isCustom: true
  }
];

interface PlansStore {
  plans: Plan[];
  selectedPlan: Plan | null;
  setSelectedPlan: (plan: Plan) => void;
}

export const usePlansStore = create<PlansStore>((set) => ({
  plans,
  selectedPlan: null,
  setSelectedPlan: (plan) => set({ selectedPlan: plan }),
}));