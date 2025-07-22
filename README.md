# City Reconstruction Game

An interactive decision-making game where players engage with NPCs to make choices about city reconstruction, balancing sustainability with economic factors.

## Setup & Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd multiagent
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your API keys:
```
OPENROUTER_API_KEY=your-api-key-here
PINECONE_API_KEY=your-pinecone-api-key-here
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Game Controls

- **Movement**: Arrow keys or WASD to move the player
- **Inventory**: Press 'I' to open/close inventory
- **Hotbar**: Number keys 1-5 to select slots, or click slots
- **Interaction**: Press 'E' near an NPC to start conversation
- **Chat**: Press 'ESC' to close chat dialog

## Game Features

### NPCs & Systems
The game features 6 NPCs, each managing a different city system:

1. **Mrs. Aria** (Water Cycle)
   - Retired Ecologist
   - Options: Constructed Wetlands vs. Chemical Filtration Tanks

2. **Chief Oskar** (Energy Grid)
   - Infrastructure Engineer
   - Options: Local Solar Microgrids vs. Gas Power Hub

3. **Mr. Moss** (Fuel Acquisition)
   - Fuel Supplier
   - Options: Biofuel Cooperative vs. Diesel Supply Contracts

4. **Miss Dai** (Land Use)
   - Volunteer Teacher
   - Options: Urban Agriculture Zones vs. Industrial Expansion

5. **Ms. Kira** (Water Distribution)
   - Water Justice Activist
   - Options: Public Shared Reservoir vs. Tiered Access Contracts

6. **Mr. Han** (Housing & Shelter)
   - Builder/Constructor
   - Options: Modular Eco-Pods vs. Smart Concrete Complex

### Conversation Rounds

The game features three distinct conversation rounds with each NPC:

#### Round 1: Introduction
- NPCs introduce themselves
- Explain their role in city reconstruction
- Brief mention of available options

#### Round 2: Options Exploration
- Detailed explanation of each option
- Discussion of pros and cons
- Economic vs. environmental trade-offs

#### Round 3: Advocacy
- NPCs take a stance (pro/anti sustainable)
- Present arguments for their preferred option
- Engage in deeper discussion about choices

Use the round selector in the chat interface to switch between different conversation phases.

## Development

### Project Structure
```
multiagent/
├── components/         # React components
├── game/              # Phaser game logic
│   ├── managers/      # Game systems management
│   ├── scenes/        # Game scenes
│   └── types/         # TypeScript definitions
├── pages/             # Next.js pages
│   └── api/           # Backend API routes
├── public/            # Static assets
│   └── assets/        # Game assets
├── utils/             # Utility functions
└── styles/            # CSS styles
```

### Key Technologies
- Next.js for the web framework
- Phaser for game engine
- OpenRouter API for NPC conversations
- Pinecone for vector embeddings
- TypeScript for type safety
- Tailwind CSS for styling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.