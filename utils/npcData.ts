// Shared NPC data - single source of truth for all components

export const NPCNames: { [key: number]: string } = {
  [-1]: 'The Guide',
  1: 'Mr. Dai',
  2: 'Ms. Moss',
  3: 'Chief Oskar',
  4: 'Ms. Kira',
  5: 'Mr. Aria',
  6: 'Mrs. Han'
}

export const NPCSystems: { [key: number]: string } = {
  1: 'Land Use',
  2: 'Fuel Acquisition',
  3: 'Energy Grid',
  4: 'Water Distribution',
  5: 'Water Cycle',
  6: 'Housing & Shelter'
}

export const NPCOptions: { [key: number]: { sustainable: string; unsustainable: string; system: string } } = {
  [-1]: { 
    sustainable: 'Sustainable Development', 
    unsustainable: 'Economic Growth',
    system: 'City Planning'
  },
  1: { 
    sustainable: 'Urban Agriculture Zones', 
    unsustainable: 'Industrial Expansion',
    system: 'Land Use'
  },
  2: { 
    sustainable: 'Biofuel Cooperative', 
    unsustainable: 'Diesel Supply Contracts',
    system: 'Fuel Acquisition'
  },
  3: { 
    sustainable: 'Local Solar Microgrids', 
    unsustainable: 'Gas Power Hub',
    system: 'Energy Grid'
  },
  4: { 
    sustainable: 'Public Shared Reservoir', 
    unsustainable: 'Tiered Access Contracts',
    system: 'Water Distribution'
  },
  5: { 
    sustainable: 'Constructed Wetlands', 
    unsustainable: 'Chemical Filtration Tanks',
    system: 'Water Cycle'
  },
  6: { 
    sustainable: 'Modular Eco-Pods', 
    unsustainable: 'Smart Concrete Complex',
    system: 'Housing & Shelter'
  }
}

// Option descriptions for each NPC
export const OptionDescriptions: { [key: number]: { sustainable: string; unsustainable: string } } = {
  1: {
    sustainable: 'Community gardens and urban farms integrated into city planning. Creates green spaces, local food production, and community engagement.',
    unsustainable: 'Large-scale industrial zones replacing residential areas. Maximizes economic output but reduces quality of life and environmental health.'
  },
  2: {
    sustainable: 'Local biofuel production using agricultural waste and algae. Creates jobs, reduces carbon footprint, and builds community resilience.',
    unsustainable: 'Traditional diesel contracts with external suppliers. Lower upfront costs but locks city into fossil fuel dependency and external control.'
  },
  3: {
    sustainable: 'Decentralized solar power systems with local battery storage. Reduces transmission losses and increases community energy independence.',
    unsustainable: 'Centralized gas-powered electricity grid. Reliable and familiar but maintains dependency on fossil fuels and external energy markets.'
  },
  4: {
    sustainable: 'Public water system with equal access for all residents. Ensures basic human right to water regardless of economic status.',
    unsustainable: 'Privatized water system with tiered pricing based on usage. May encourage conservation but creates barriers for low-income families.'
  },
  5: {
    sustainable: 'Natural water purification using constructed wetlands and biological processes. Works with nature, slower but environmentally sustainable.',
    unsustainable: 'Chemical-based water treatment systems. Faster and more efficient but introduces toxins and requires ongoing chemical inputs.'
  },
  6: {
    sustainable: 'Modular, eco-friendly housing units made from sustainable materials. Quick to deploy, environmentally conscious, and adaptable.',
    unsustainable: 'Large-scale concrete housing complexes with smart technology. More durable and feature-rich but extremely resource-intensive to build.'
  }
};

// NPC preference configuration - which option each NPC supports
export const NPCPreferences: { [key: number]: 'sustainable' | 'unsustainable' } = {
  1: 'sustainable',    // Mr. Dai (Land Use) - supports Urban Agriculture Zones
  2: 'sustainable',    // Ms. Moss (Fuel Acquisition) - supports Biofuel Cooperative
  3: 'unsustainable',  // Chief Oskar (Energy Grid) - supports Gas Power Hub 
  4: 'sustainable',    // Ms. Kira (Water Distribution) - supports Public Shared Reservoir
  5: 'sustainable',    // Mr. Aria (Water Cycle) - supports Constructed Wetlands
  6: 'sustainable'     // Mrs. Han (Housing & Shelter) - supports Modular Eco-Pods
};

// Cache for generated preferences to ensure consistency
const preferencesCache: { [participantId: string]: { [key: number]: 'sustainable' | 'unsustainable' } } = {};

// Function to clear the preferences cache (useful for testing)
export const clearPreferencesCache = (): void => {
  Object.keys(preferencesCache).forEach(key => delete preferencesCache[key]);
  console.log('Preferences cache cleared');
};

// Function to get cache info for debugging
export const getPreferencesCacheInfo = (): { cachedParticipants: string[]; cacheSize: number } => {
  return {
    cachedParticipants: Object.keys(preferencesCache),
    cacheSize: Object.keys(preferencesCache).length
  };
};

// Simple deterministic random number generator based on seed
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  let state = Math.abs(hash);
  
  return function() {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

// Deterministic shuffle function using seeded random
function deterministicShuffle<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  const random = seededRandom(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Function to generate NPC preferences based on participant ID
export const generateNPCPreferences = (participantId: string): { [key: number]: 'sustainable' | 'unsustainable' } => {
  // Check if we already have cached preferences for this participant
  if (preferencesCache[participantId]) {
    console.log(`Using cached preferences for participant: ${participantId}`);
    return preferencesCache[participantId];
  }
  
  // Clear cache for single-letter prefixed IDs to ensure correct regeneration
  const participantFirstChar = participantId.charAt(0).toUpperCase();
  if (['P', 'A', 'N'].includes(participantFirstChar)) {
    Object.keys(preferencesCache).forEach(key => {
      if (key.charAt(0).toUpperCase() === participantFirstChar) {
        delete preferencesCache[key];
        console.log(`Cleared cached preferences for: ${key}`);
      }
    });
  }
  
  console.log(`Generating new preferences for participant: ${participantId}`);
  
  const firstChar = participantId.charAt(0).toUpperCase();
  
  // Create a base array of all NPCs
  const allNPCs = [1, 2, 3, 4, 5, 6];
  
  let preferences: { [key: number]: 'sustainable' | 'unsustainable' } = {};
  
  if (firstChar === 'P') {
    // P2, P3, P4, etc.: 5 sustainable, 1 unsustainable (pro-sustainable bias)
    const sustainableNPCs = deterministicShuffle([...allNPCs], participantId).slice(0, 5);
    const unsustainableNPCs = allNPCs.filter(id => !sustainableNPCs.includes(id));
    
    allNPCs.forEach(id => {
      preferences[id] = sustainableNPCs.includes(id) ? 'sustainable' : 'unsustainable';
    });
    
  } else if (firstChar === 'A') {
    // A2, A3, A4, etc.: 1 sustainable, 5 unsustainable (pro-economic bias)
    const sustainableNPCs = deterministicShuffle([...allNPCs], participantId).slice(0, 1);
    const unsustainableNPCs = allNPCs.filter(id => !sustainableNPCs.includes(id));
    
    allNPCs.forEach(id => {
      preferences[id] = sustainableNPCs.includes(id) ? 'sustainable' : 'unsustainable';
    });
    
  } else if (firstChar === 'N') {
    // N2, N3, N4, etc.: 3 sustainable, 3 unsustainable (balanced)
    const sustainableNPCs = deterministicShuffle([...allNPCs], participantId).slice(0, 3);
    const unsustainableNPCs = allNPCs.filter(id => !sustainableNPCs.includes(id));
    
    allNPCs.forEach(id => {
      preferences[id] = sustainableNPCs.includes(id) ? 'sustainable' : 'unsustainable';
    });
    
  } else {
    // Default: return current static configuration
    preferences = NPCPreferences;
  }
  
  // Cache the preferences for this participant
  preferencesCache[participantId] = preferences;
  
  console.log(`Cached preferences for participant ${participantId}:`, preferences);
  
  return preferences;
};

// DEPRECATED: shuffleArray function removed - use deterministicShuffle instead

// Function to generate recommendations based on preferences
export const generateSpecialistRecommendations = (preferences: { [key: number]: 'sustainable' | 'unsustainable' }): { [key: number]: string } => {
  const recommendations: { [key: number]: string } = {};
  
  // Pre-written recommendations for each NPC and option
  const recommendationTexts: { [key: number]: { sustainable: string; unsustainable: string } } = {
    1: {
      sustainable: 'I recommend the Urban Agriculture Zones. They create community spaces and improve food security. The industrial expansion might bring more tax revenue, but it eliminates green spaces and increases pollution. We need to balance economic growth with community wellbeing.',
      unsustainable: 'I recommend the Industrial Expansion. Economic growth is crucial for our city\'s recovery. The urban agriculture zones are nice in theory, but we need the tax revenue and jobs that industry provides. We can always add green spaces later when we\'re more prosperous.'
    },
    2: {
      sustainable: 'I recommend the Biofuel Cooperative. It creates local jobs and reduces our carbon footprint. The diesel contracts might be cheaper upfront, but they lock us into fossil fuel dependency. We need to invest in sustainable alternatives now, even if it costs more initially.',
      unsustainable: 'I recommend the Diesel Supply Contracts. Reliability is crucial for fuel systems. The biofuel cooperative is innovative but has limited production capacity. Right now, we need guaranteed fuel availability to keep the city running. The contracts provide stable pricing and supply.'
    },
    3: {
      sustainable: 'I recommend the Local Solar Microgrids. While they require more initial investment, they provide long-term energy independence and reduce our carbon footprint. The gas hub might be more reliable in the short term, but it keeps us dependent on fossil fuels.',
      unsustainable: 'I recommend the Gas Power Hub. Stability comes first in energy systems. The solar microgrids are promising but require massive battery storage for reliability. Right now, we need guaranteed power to keep the city running. The Hub integrates smoothly with existing infrastructure.'
    },
    4: {
      sustainable: 'I recommend the Public Shared Reservoir. Water is a basic human right that shouldn\'t be privatized. The tiered contracts might encourage conservation, but they could create water poverty for low-income families. Equal access ensures no one goes thirsty.',
      unsustainable: 'I recommend the Tiered Access Contracts. Water conservation is essential, and usage-based pricing encourages responsible consumption. The public reservoir might ensure equal access, but it doesn\'t incentivize conservation. We need to balance access with sustainability.'
    },
    5: {
      sustainable: 'I recommend the Constructed Wetlands. While they take longer to purify water, they work with nature rather than against it. The chemical tanks might be faster, but they introduce toxins that could harm the ecosystem for generations. We need to think long-term about our water quality.',
      unsustainable: 'I recommend the Chemical Filtration Tanks. Speed and efficiency are critical for water treatment. The constructed wetlands are environmentally friendly, but they take too long and require too much land. We need immediate, reliable water purification.'
    },
    6: {
      sustainable: 'I recommend the Modular Eco-Pods. They\'re quick to deploy and environmentally friendly. The smart concrete complexes might be more durable, but they\'re extremely resource-intensive. We need housing solutions that don\'t destroy the environment we\'re trying to rebuild.',
      unsustainable: 'I recommend the Smart Concrete Complex. Durability and long-term value are essential for housing. The eco-pods are quick to deploy, but they may not withstand the test of time. We need housing that lasts generations, not just years.'
    }
  };
  
  // Generate recommendations based on preferences
  for (let npcId = 1; npcId <= 6; npcId++) {
    const preference = preferences[npcId];
    recommendations[npcId] = recommendationTexts[npcId][preference];
  }
  
  return recommendations;
};

// Helper function to get the correct image filename for each NPC
export const getNPCImage = (npcId: number): string => {
  const imageMap: { [key: number]: string } = {
    1: 'volunteerteacher(mr-dai).png',
    2: 'fuelsupplier(ms-moss).png',
    3: 'engineer(chief-oskar).png',
    4: 'waterjusticeactivist(ms-kira).png',
    5: 'ecologist(mr-aria).png',
    6: 'builder(mrs-han).png'
  };
  
  return imageMap[npcId] || `${npcId}.1.png`;
};

// Helper function to get the recommended option for an NPC
export const getNPCRecommendedOption = (npcId: number): string => {
  const preference = NPCPreferences[npcId];
  if (preference === 'sustainable') {
    return NPCOptions[npcId].sustainable;
  } else {
    return NPCOptions[npcId].unsustainable;
  }
};

// Helper function to check if an NPC supports sustainable option
export const doesNPCSupportSustainable = (npcId: number): boolean => {
  return NPCPreferences[npcId] === 'sustainable';
};

// Test function to verify deterministic randomization
export const testDeterministicRandomization = (): void => {
  const testParticipantId = 'PX123456789';
  
  console.log('Testing deterministic randomization...');
  
  // Generate preferences multiple times
  const preferences1 = generateNPCPreferences(testParticipantId);
  const preferences2 = generateNPCPreferences(testParticipantId);
  const preferences3 = generateNPCPreferences(testParticipantId);
  
  // All should be identical
  const areIdentical = JSON.stringify(preferences1) === JSON.stringify(preferences2) && 
                       JSON.stringify(preferences2) === JSON.stringify(preferences3);
  
  console.log('Preferences 1:', preferences1);
  console.log('Preferences 2:', preferences2);
  console.log('Preferences 3:', preferences3);
  console.log('All preferences identical:', areIdentical);
  
  if (areIdentical) {
    console.log('✅ Deterministic randomization working correctly!');
  } else {
    console.error('❌ Deterministic randomization failed!');
  }
  
  // Test different participant IDs
  const testParticipantId2 = 'AX987654321';
  const preferences4 = generateNPCPreferences(testParticipantId2);
  console.log('Different participant preferences:', preferences4);
}; 