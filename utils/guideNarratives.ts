export interface GuideNarrative {
  id: string;
  text: string;
  context: 'initial' | 'pda_intro' | 'round_advance' | 'decision_phase' | 'completion';
  phase: 'start' | 'round1' | 'final';
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
    text: "You've been chosen to lead the recovery mission. Six experts are waiting, each responsible for a core part of Earth's recovery. Talk to all of them, understand their challenges, explore their solutions, and get their recommendations.",
    context: 'initial',
    phase: 'start'
  },
  {
    id: 'pda_intro',
    text: "Each expert will explain their system, present two options, and give you their professional recommendation. Use the PDA (hotbar slot 1) to track your progress and make final decisions.",
    context: 'pda_intro',
    phase: 'start'
  },
  {
    id: 'expert_perspectives',
    text: "Keep in mind that these experts have two different priorities: Economic Plan(EP) and Resource Plan(RP). Some experts prioritize resources(RP) while others prefer to consider the economics(EP) of the situation. You'll need to listen to their opinions when you make your final choices.",
    context: 'initial',
    phase: 'start'
  },
  {
    id: 'initial_start',
    text: "Let's get started. Earth is waiting.",
    context: 'initial',
    phase: 'start'
  },

  // Decision phase transition
  {
    id: 'decision_ready',
    text: "Excellent work. You've spoken with all six experts and gathered their recommendations. Now it's time to make the critical decisions that will shape Earth's future.",
    context: 'round_advance',
    phase: 'round1'
  },

  // Decision phase
  {
    id: 'decision_phase_1',
    text: "Now comes the moment we've all been preparing for. Your choices will determine how we rebuild Earth. There are no perfect solutions, only the ones you believe in.",
    context: 'decision_phase',
    phase: 'final'
  },
  {
    id: 'decision_phase_2',
    text: "Are you ready to choose the future? Click \"Continue\" to make the final decisions.",
    context: 'decision_phase',
    phase: 'final'
  },

  // Good ending (6 sustainable selections)
  {
    id: 'good_ending_1',
    text: "Congratulations. By choosing sustainable solutions in all key systems, you've laid the foundation for a city that can thrive long into the future.",
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

  // Medium ending (4–5 sustainable selections)
  {
    id: 'medium_ending_1',
    text: "You have brought the city to a fragile balance. We did some good things, made some sustainable choices, but more remains to be done.",
    context: 'completion',
    phase: 'final'
  },
  {
    id: 'medium_ending_2',
    text: "Some systems recovered, but others remained unstable. Progress is real, yet incomplete.",
    context: 'completion',
    phase: 'final'
  },
  {
    id: 'medium_ending_3',
    text: "The game is finished, but the future is still uncertain. You can make more sustainable choices in the future, make the earth better.",
    context: 'completion',
    phase: 'final'
  },

  // Bad ending (1–3 sustainable selections)
  {
    id: 'bad_ending_1',
    text: "It's over. The final systems have collapsed. The city is no longer salvageable. You focus too much on the resource plan, while ignoring the environment of the earth.",
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
    text: "This isn't just the end of a city. The game is finished, but the future is still uncertain. You can make more sustainable choices in the future, and make the earth better.",
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
  return getGuideNarratives('decision_phase', 'final');
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
export function getGuideQuickReplies(round: number, spokenRound1Count: number): string[] {
  // Decision phase complete (all 6 NPCs spoken to)
  if (spokenRound1Count >= 6) {
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

  // Decision phase small talk (all 6 NPCs spoken to)
  if (spokenRound1Count >= 6) {
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
