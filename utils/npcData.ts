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

// Specialist recommendations for Round 2 - updated to reflect their actual preferences
export const SpecialistRecommendations: { [key: number]: string } = {
  1: 'I recommend the Urban Agriculture Zones. They create community spaces and improve food security. The industrial expansion might bring more tax revenue, but it eliminates green spaces and increases pollution. We need to balance economic growth with community wellbeing.',
  2: 'I recommend the Biofuel Cooperative. It creates local jobs and reduces our carbon footprint. The diesel contracts might be cheaper upfront, but they lock us into fossil fuel dependency. We need to invest in sustainable alternatives now, even if it costs more initially.',
  3: 'I recommend the Gas Power Hub. Stability comes first in energy systems. The solar microgrids are promising but require massive battery storage for reliability. Right now, we need guaranteed power to keep the city running. The Hub integrates smoothly with existing infrastructure.',
  4: 'I recommend the Public Shared Reservoir. Water is a basic human right that shouldn\'t be privatized. The tiered contracts might encourage conservation, but they could create water poverty for low-income families. Equal access ensures no one goes thirsty.',
  5: 'I recommend the Constructed Wetlands. While they take longer to purify water, they work with nature rather than against it. The chemical tanks might be faster, but they introduce toxins that could harm the ecosystem for generations. We need to think long-term about our water quality.',
  6: 'I recommend the Modular Eco-Pods. They\'re quick to deploy and environmentally friendly. The smart concrete complexes might be more durable, but they\'re extremely resource-intensive. We need housing solutions that don\'t destroy the environment we\'re trying to rebuild.'
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