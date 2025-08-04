# City Reconstruction Game Sequence

## Game Overview
The player is a city planner tasked with making decisions about 6 different city systems. Each system has sustainable and unsustainable options. The game has two rounds: learning phase and decision phase.

## Detailed Game Sequence

### Initial Setup
1. **Game starts** - Player spawns in the city
2. **Main NPC (The Guide) is available** - Player must press E to interact
3. **Main NPC introduces the game**:
   - "Welcome to City Reconstruction! I'm your guide for this project."
   - "You'll need to visit 6 different city systems and learn about their options."
   - "Each system has sustainable and unsustainable choices. Let's start with Round 1 - the learning phase."
   - "Go talk to each NPC to learn about their system and the available options."

### Round 1: Learning Phase
4. **Player visits all 6 NPCs** to learn about systems:
   - **Mrs. Aria** (Water Cycle): Constructed Wetlands vs Chemical Filtration Tanks
   - **Chief Oskar** (Energy Grid): Local Solar Microgrids vs Gas Power Hub
   - **Mr. Moss** (Fuel Acquisition): Biofuel Cooperative vs Diesel Supply Contracts
   - **Miss Dai** (Land Use): Urban Agriculture Zones vs Industrial Expansion
   - **Ms. Kira** (Water Distribution): Public Shared Reservoir vs Tiered Access Contracts
   - **Mr. Han** (Housing & Shelter): Modular Eco-Pods vs Smart Concrete Complex

5. **Progress tracking**: System tracks which NPCs player has spoken to in Round 1
6. **ProgressIndicator guidance**: Shows "Round 1: Talk to specialists to learn about their systems (X/6)"
7. **When all 6 NPCs are spoken to in Round 1**:
   - **ProgressIndicator updates**: Shows "Round 1 complete! Talk to The Guide to advance to Round 2"
   - **Player must talk to The Guide** to advance to Round 2
   - **System validates**: All 6 NPCs must be marked as spoken to in Round 1
   - **LLM analyzes**: Conversation context + progress data to determine if ready for Round 2
   - **If ready**: Main NPC advances to Round 2 with appropriate dialogue
   - **If not ready**: Main NPC encourages player to continue learning

### Round 2: Discovery Phase
8. **Player visits all 6 NPCs again** to learn their preferences:
   - Each NPC reveals their opinion on sustainable vs unsustainable options
   - NPCs explain their reasoning and concerns
   - Player learns about trade-offs and consequences

9. **Progress tracking**: System tracks which NPCs player has spoken to in Round 2
10. **ProgressIndicator guidance**: Shows "Round 2: Get recommendations from specialists (X/6)"
11. **When all 6 NPCs are spoken to in Round 2**:
    - **ProgressIndicator updates**: Shows "Round 2 complete! Talk to The Guide to make final decisions"
    - **Player must talk to The Guide** to open PDA decision mode
    - **System validates**: All 6 NPCs must be marked as spoken to in Round 2
    - **LLM analyzes**: Conversation context + progress data to determine if ready for decisions
    - **If ready**: Main NPC opens PDA decision mode and provides final guidance
    - **If not ready**: Main NPC encourages player to continue gathering opinions

### Final Decision Phase
12. **PDA automatically opens** in decision mode
13. **ProgressIndicator guidance**: Shows "Open your PDA to review all systems and make final decisions"
14. **Player makes 6 final choices** (one per system):
    - Must choose between sustainable or unsustainable for each system
    - Can review all information before making decisions
    - No going back once decisions are made

### Game Ending
15. **Game calculates ending** based on choices:
    - **Good Ending**: More sustainable choices (4-6 sustainable)
    - **Medium Ending**: Balanced choices (3 sustainable, 3 unsustainable)
    - **Bad Ending**: More unsustainable choices (0-2 sustainable)

## Key Mechanics
- **Main NPC is neutral** - doesn't advocate for sustainable or unsustainable
- **Main NPC requires interaction** - player must press E to talk to The Guide
- **Rounds are clearly defined** - Round 1 for learning, Round 2 for discovery
- **ProgressIndicator provides guidance** - shows current status and next steps
- **PDA tracks progress** - shows systems, options, and NPC opinions
- **Decisions are final** - no changing choices after submission
- **Guide conversation history is preserved** - The Guide remembers previous conversations across rounds

## LLM-Based Conversation System
- **Smart conversation flow**: LLM analyzes player input + progress data to determine appropriate responses
- **Progress validation**: System checks actual NPC conversation completion before allowing round advancement
- **Natural dialogue**: LLM handles acknowledgments, questions, and round progression naturally
- **Anti-cheat protection**: Players cannot advance rounds by just talking to The Guide repeatedly
- **Context awareness**: LLM considers conversation history and current game state
- **Persistent Guide memory**: The Guide's conversation history is preserved across rounds using special session keys

## Round Progression Enforcement
- **Round 1 completion required**: All 6 NPCs must be spoken to before Round 2
- **Round 2 completion required**: All 6 NPCs must be spoken to before PDA decisions
- **Guide interaction required**: Player must talk to The Guide after completing each round
- **ProgressIndicator guidance**: Clear messages showing what to do next at each stage
- **VectorStore persistence**: The Guide uses special conversation keys that persist across rounds

## NPC Systems and Options
1. **Water Cycle** (Mrs. Aria)
   - Sustainable: Constructed Wetlands
   - Unsustainable: Chemical Filtration Tanks

2. **Energy Grid** (Chief Oskar)
   - Sustainable: Local Solar Microgrids
   - Unsustainable: Gas Power Hub

3. **Fuel Acquisition** (Mr. Moss)
   - Sustainable: Biofuel Cooperative
   - Unsustainable: Diesel Supply Contracts

4. **Land Use** (Miss Dai)
   - Sustainable: Urban Agriculture Zones
   - Unsustainable: Industrial Expansion

5. **Water Distribution** (Ms. Kira)
   - Sustainable: Public Shared Reservoir
   - Unsustainable: Tiered Access Contracts

6. **Housing & Shelter** (Mr. Han)
   - Sustainable: Modular Eco-Pods
   - Unsustainable: Smart Concrete Complex

## PDA (Personal Digital Assistant)
- **Information tab**: Shows all systems, options, and detailed descriptions
- **Decision tab**: Allows final choices between sustainable and unsustainable options
- **Progress tracking**: Shows which specialists have been consulted
- **Hardcoded opinions**: Specialist recommendations are consistent and reliable
- **Always visible**: System information is shown by default, no clicking required

## ProgressIndicator Guidance Messages
- **Before game starts**: "Talk to The Guide to start your mission"
- **Round 1 incomplete**: "Round 1: Talk to specialists to learn about their systems (X/6)"
- **Round 1 complete, Guide not talked to**: "Round 1 complete! Talk to The Guide to advance to Round 2"
- **Round 1 complete, Guide talked to**: "Round 2: Talk to all specialists to get their recommendations"
- **Round 2 incomplete**: "Round 2: Get recommendations from specialists (X/6)"
- **Round 2 complete, Guide not talked to**: "Round 2 complete! Talk to The Guide to make final decisions"
- **Round 2 complete, Guide talked to**: "Open your PDA to review all systems and make final decisions"