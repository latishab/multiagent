# City Reconstruction Game Sequence

## Game Overview
The player is a city planner tasked with making decisions about 6 different city systems. Each system has sustainable and unsustainable options. The game has two rounds: learning phase and decision phase.

## Detailed Game Sequence

### Initial Setup
1. **Game starts** - Player spawns in the city
2. **Main NPC (The Guide) automatically approaches** - No player interaction needed
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
6. **When player talks to Main NPC after completing Round 1**:
   - **System validates**: All 6 NPCs must be marked as spoken to in Round 1
   - **LLM analyzes**: Conversation context + progress data to determine if ready for Round 2
   - **If ready**: Main NPC advances to Round 2 with appropriate dialogue
   - **If not ready**: Main NPC encourages player to continue learning

### Round 2: Discovery Phase
7. **Player visits all 6 NPCs again** to learn their preferences:
   - Each NPC reveals their opinion on sustainable vs unsustainable options
   - NPCs explain their reasoning and concerns
   - Player learns about trade-offs and consequences

8. **Progress tracking**: System tracks which NPCs player has spoken to in Round 2
9. **When player talks to Main NPC after completing Round 2**:
   - **System validates**: All 6 NPCs must be marked as spoken to in Round 2
   - **LLM analyzes**: Conversation context + progress data to determine if ready for decisions
   - **If ready**: Main NPC opens PDA decision mode and provides final guidance
   - **If not ready**: Main NPC encourages player to continue gathering opinions

### Final Decision Phase
10. **PDA automatically opens** in decision mode
11. **Player makes 6 final choices** (one per system):
    - Must choose between sustainable or unsustainable for each system
    - Can review all information before making decisions
    - No going back once decisions are made

### Game Ending
12. **Game calculates ending** based on choices:
    - **Good Ending**: More sustainable choices (4-6 sustainable)
    - **Medium Ending**: Balanced choices (3 sustainable, 3 unsustainable)
    - **Bad Ending**: More unsustainable choices (0-2 sustainable)

## Key Mechanics
- **Main NPC is neutral** - doesn't advocate for sustainable or unsustainable
- **Main NPC initiates conversations** - player doesn't need to press E
- **Rounds are clearly defined** - Round 1 for learning, Round 2 for discovery
- **PDA tracks progress** - shows systems, options, and NPC opinions
- **Decisions are final** - no changing choices after submission

## LLM-Based Conversation System
- **Smart conversation flow**: LLM analyzes player input + progress data to determine appropriate responses
- **Progress validation**: System checks actual NPC conversation completion before allowing round advancement
- **Natural dialogue**: LLM handles acknowledgments, questions, and round progression naturally
- **Anti-cheat protection**: Players cannot advance rounds by just talking to The Guide repeatedly
- **Context awareness**: LLM considers conversation history and current game state

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