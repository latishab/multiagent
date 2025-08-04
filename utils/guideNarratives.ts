export interface GuideNarrative {
  id: string;
  text: string;
  context: 'initial' | 'pda_intro' | 'round_advance' | 'decision_phase' | 'completion';
  phase: 'start' | 'round1' | 'round2' | 'final';
}

export const guideNarratives: GuideNarrative[] = [
  // Initial greeting and introduction
  {
    id: 'initial_greeting',
    text: "Hello! I'm The Guide. The city needs your help to make important rebuilding decisions.",
    context: 'initial',
    phase: 'start'
  },
  {
    id: 'initial_mission',
    text: "Talk to 6 specialists to learn about their systems and options. Come back to me when you've spoken to everyone.",
    context: 'initial',
    phase: 'start'
  },
  {
    id: 'pda_intro',
    text: "Use your PDA (hotbar slot 1) to track what you learn. The Information tab stores your research, and Make Decisions will unlock later.",
    context: 'pda_intro',
    phase: 'start'
  },

  // Round advancement
  {
    id: 'round_advance_1',
    text: "Excellent work! You've spoken to all the specialists and learned about their systems.",
    context: 'round_advance',
    phase: 'round1'
  },
  {
    id: 'round_advance_2',
    text: "Now it's time to dive deeper. Return to each specialist to learn about their specific recommendations and reasoning.",
    context: 'round_advance',
    phase: 'round1'
  },
  {
    id: 'round_advance_3',
    text: "This is the discovery phase - focus on understanding their perspectives and the trade-offs between sustainable and economic options.",
    context: 'round_advance',
    phase: 'round1'
  },

  // Decision phase
  {
    id: 'decision_phase_1',
    text: "Perfect! You've completed your research and now have all the information you need.",
    context: 'decision_phase',
    phase: 'round2'
  },
  {
    id: 'decision_phase_2',
    text: "It's time to make the final decisions for the city's future. Open your PDA and go to the Make Decisions tab.",
    context: 'decision_phase',
    phase: 'round2'
  },
  {
    id: 'decision_phase_3',
    text: "Review all the information you've collected and choose between sustainable and economic options for each system. The future of the city depends on your choices!",
    context: 'decision_phase',
    phase: 'round2'
  },

  // Completion
  {
    id: 'completion_1',
    text: "Congratulations! You've made all the decisions for the city's reconstruction.",
    context: 'completion',
    phase: 'final'
  },
  {
    id: 'completion_2',
    text: "Your choices will shape the future of this city. Thank you for your careful consideration of all the factors involved.",
    context: 'completion',
    phase: 'final'
  }
];

export function getGuideNarratives(context: GuideNarrative['context'], phase: GuideNarrative['phase']): GuideNarrative[] {
  return guideNarratives.filter(narrative => 
    narrative.context === context && narrative.phase === phase
  );
}

export function getInitialGuideMessages(): GuideNarrative[] {
  return [
    ...getGuideNarratives('initial', 'start'),
    ...getGuideNarratives('pda_intro', 'start')
  ];
}

export function getRoundAdvancementMessages(): GuideNarrative[] {
  return getGuideNarratives('round_advance', 'round1');
}

export function getDecisionPhaseMessages(): GuideNarrative[] {
  return getGuideNarratives('decision_phase', 'round2');
}

export function getCompletionMessages(): GuideNarrative[] {
  return getGuideNarratives('completion', 'final');
}

export function narrativesToMessages(narratives: GuideNarrative[]): { text: string; sender: 'npc' }[] {
  return narratives.map(narrative => ({
    text: narrative.text,
    sender: 'npc' as const
  }));
} 