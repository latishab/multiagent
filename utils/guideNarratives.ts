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
    text: "Welcome. I'm Michael, a civic officer with the Global Recovery Authority. It's good to finally have you here. After centuries away from Earth, the time has come for us to return. Our mission is simple but urgent: to rebuild our home.",
    context: 'initial',
    phase: 'start'
  },
  {
    id: 'initial_mission',
    text: "You've been chosen to lead the recovery mission. And you're not alone. Six experts are already waiting. Each of them is responsible for a core part of the Earth's recovery. You'll need to talk to all of them. Understand the crises they face, explore their proposals, and weigh your options carefully.",
    context: 'initial',
    phase: 'start'
  },
  {
    id: 'pda_intro',
    text: "You'll go through two rounds of conversation with each expert. These discussions are crucial to shaping your final decisions. I'll be here throughout the entire process to guide you. In our facility, you will see these 6 experts and be able to talk to them as you approach them. You can use these commands to do so. You can click hotbar slot 1 to open the PDA.",
    context: 'pda_intro',
    phase: 'start'
  },
  {
    id: 'initial_start',
    text: "Let's get started. Earth is waiting.",
    context: 'initial',
    phase: 'start'
  },

  // Round advancement
  {
    id: 'round_advance_1',
    text: "Well done. You've just completed the first round of conversations. Now, you have a solid understanding of each system's current condition and the available recovery strategies.",
    context: 'round_advance',
    phase: 'round1'
  },
  {
    id: 'round_advance_2',
    text: "But choosing a final plan for each system is not a simple decision. Each choice involves difficult trade-offs: technical feasibility, financial cost, policy alignment, and long-term impact. That's why the next step is critical.",
    context: 'round_advance',
    phase: 'round1'
  },
  {
    id: 'round_advance_3',
    text: "You'll now enter a second round of discussion with all six experts. This time, dig deeper. Ask hard questions. Challenge assumptions. Make sure you understand not just the solutions, but their consequences.",
    context: 'round_advance',
    phase: 'round1'
  },
  {
    id: 'round_advance_4',
    text: "Ready to continue?",
    context: 'round_advance',
    phase: 'round1'
  },

  // Decision phase
  {
    id: 'decision_phase_1',
    text: "You've done an excellent job. You've just completed in-depth discussions with all six system leaders. These weren't easy conversations. Thanks to your effort, we now have a clearer view of the possibilities ahead.",
    context: 'decision_phase',
    phase: 'round2'
  },
  {
    id: 'decision_phase_2',
    text: "But now comes the moment we've all been preparing for. It's time to make the most important decision that will shape the future of Earth's revival and human survival.",
    context: 'decision_phase',
    phase: 'round2'
  },
  {
    id: 'decision_phase_3',
    text: "Your choices will determine how we rebuild. There are no perfect solutions, only the ones you believe in.",
    context: 'decision_phase',
    phase: 'round2'
  },
  {
    id: 'decision_phase_4',
    text: "Are you ready to choose the future? Click \"Continue\" to make the final decision.",
    context: 'decision_phase',
    phase: 'round2'
  },

  // Good ending
  {
    id: 'good_ending_1',
    text: "Congratulations. You've made bold, thoughtful decisions and your efforts have paid off. By choosing sustainable solutions in most key systems, you've laid the foundation for a city that can thrive long into the future.",
    context: 'completion',
    phase: 'final'
  },
  {
    id: 'good_ending_2',
    text: "The systems you rebuilt now work with nature, not against it. Water flows clean. Energy is resilient. Life is returning to the soil. For the first time in a thousand years, Earth breathes again. And it's because of your courage, your wisdom, your vision.",
    context: 'completion',
    phase: 'final'
  },
  {
    id: 'good_ending_3',
    text: "Of course, challenges will remain. But you've proven that human civilization can adapt and that we can still choose the right path, even at the edge of collapse. You didn't just save a city. You sparked a new beginning for Earth, and for all of us.",
    context: 'completion',
    phase: 'final'
  },
  {
    id: 'good_ending_4',
    text: "Thank you, Commander. Welcome home.",
    context: 'completion',
    phase: 'final'
  },

  // Bad ending
  {
    id: 'bad_ending_1',
    text: "It's over. The final systems have collapsed. The city is no longer salvageable. Despite your efforts, the choices made didn't provide the resilience we needed. Short-term fixes gave way to long-term failures.",
    context: 'completion',
    phase: 'final'
  },
  {
    id: 'bad_ending_2',
    text: "The soil turned to dust. The air grew toxic. Energy faltered. Water ran out. The systems fell, one after another. We can't blame one decision. But together, they weren't enough to steer us away from destruction.",
    context: 'completion',
    phase: 'final'
  },
  {
    id: 'bad_ending_3',
    text: "This isn't just the end of a city. It's the consequence of choices made when we had a chance to change course, and didn't. Thank you for trying.",
    context: 'completion',
    phase: 'final'
  },
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

// Centralized quick replies for the Guide dialog
export function getGuideQuickReplies(round: number, spokenRound2Count: number): string[] {
  // Decision phase complete
  if (round === 2 && spokenRound2Count >= 6) {
    return ['Continue', 'One sec', 'Thanks'];
  }
  // Early game guidance (intro + round 1)
  if (round === 0 || round === 1) {
    return ['Okay', 'What should I do?', 'Can you repeat that?', 'Thanks'];
  }
  // Default fallback
  return ['Got it', 'Sounds good', 'Thanks'];
}

// Canned guide answers for common quick replies
export function getGuideCannedResponse(
  userMessage: string,
  round: number,
  spokenRound1Count: number,
  spokenRound2Count: number
): string | null {
  const text = userMessage.trim().toLowerCase();

  // Decision phase small talk
  if (round === 2 && spokenRound2Count >= 6) {
    if (text === 'one sec') {
      return "No rush. I'll be right here when you're ready to continue.";
    }
    if (text === 'thanks' || text === 'thank you') {
      return "You're welcome. When you're ready, click Continue to proceed to the final decision.";
    }
  }

  // Early game guidance
  if (round === 0 || round === 1) {
    if (text === 'what should i do?' || text === 'what should i do') {
      return "Start by speaking with all six experts in the facility. Approach each one to begin a conversation and learn about their system and options. Try to complete conversations with all six for Round 1—then I'll advance you to Round 2.";
    }
    if (text === 'can you repeat that?' || text === 'can you repeat that') {
      return "Sure. Talk to all six experts first to complete Round 1. Ask about their challenges and proposals. After you've met all six, I'll guide you into Round 2 for deeper discussion.";
    }
    if (text === 'okay') {
      return "Great. I'll be here if you need help while you meet the experts.";
    }
    if (text === 'thanks' || text === 'thank you') {
      return "Anytime. Good luck with the experts.";
    }
  }

  // General acknowledgements
  if (text === 'got it' || text === 'sounds good') {
    return "Perfect. Let me know if you have any questions.";
  }

  return null;
}