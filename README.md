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

3. Create a `.env.local` file in the root directory and add your API keys:
```
# Supabase Configuration (for conversation storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Existing API Keys
DEEPINFRA_API_KEY=your_deepinfra_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment

# Upstash Redis Configuration
KV_REST_API_URL=your_upstash_redis_url
KV_REST_API_TOKEN=your_upstash_redis_token
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

The game features two distinct conversation rounds with each NPC:

#### Round 1: Introduction
- NPCs greet the player briefly in their personal tone
- Introduce themselves with name, background, and profession
- State the reconstruction field they are responsible for
- Name the two technical solutions they hold
- Speak 1–2 sentences per response, then wait for the player to reply

#### Round 2: Options Discussion
- NPCs begin by briefly recapping the two available options
- Clearly state which option they support and why they support it
- Explain the advantages of their preferred option and the disadvantages of the alternative
- Communicate using multiple short turns (1–2 sentences per response)
- Emphasize the trade-offs between sustainable and unsustainable options
- After all 6 NPCs have spoken, the conversation is complete

The rounds progress automatically as you speak with all NPCs. You cannot manually select rounds - the system manages the flow automatically.

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
- DeepInfra API for NPC conversations
- Pinecone for vector embeddings
- TypeScript for type safety
- Tailwind CSS for styling

### Session Management

The game implements a sophisticated session management system that creates unique conversation histories for each player without requiring login/signup:

#### How It Works
- **Device Fingerprinting**: Creates a unique session ID based on browser characteristics
- **Canvas Fingerprinting**: Uses HTML5 canvas to generate unique device signatures
- **WebGL Fingerprinting**: Leverages WebGL capabilities for additional uniqueness
- **Local Storage**: Persists session IDs across browser sessions

#### Features
- **No Login Required**: Players can start playing immediately
- **Persistent Conversations**: Chat history is maintained per session
- **Multi-Device Support**: Different devices get different session IDs
- **Privacy-Friendly**: No personal data is collected or stored

#### Technical Implementation
- Session IDs are included in all conversation tracking
- Pinecone vector store filters memories by session ID
- Conversation histories are isolated per session
- Debug panel shows session ID in development mode

#### Testing
In development mode, you can test session management by running:
```javascript
// In browser console
await testSessionManagement()
```

This will verify that:
- Session IDs are generated correctly
- Sessions persist across page reloads
- Different sessions are created when cleared

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.