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