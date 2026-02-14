# Zevia 2048 Game Development Prompt

## Project Overview
Create a 2048-style sliding block puzzle game with a Zevia soda branding twist. Instead of numbered tiles that combine when equal numbers merge, players combine Zevia cans of different flavors that merge into larger package quantities, ultimately combining into the complete Zevia product line.

## Game Mechanics

### Core Gameplay
- **Grid**: 4x4 grid of tiles (same as classic 2048)
- **Movement**: Players can control tile movement using:
  - **Arrow Keys**: Up, Down, Left, Right arrows to move tiles in corresponding directions
  - **WASD Keys**: W (up), A (left), S (down), D (right)
- **Merging Rules**: 
  - Two tiles with the same flavor combine into the next flavor in the progression
  - Example: 2 Cola cans → 1 Ginger Ale, 2 Ginger Ale → 1 Lemon Lime Twist, etc.
  - The progression is: Cola → Ginger Ale → Lemon Lime Twist → Orange → Grape → Black Cherry → Caffeine Free Cola → Cherry Cola → Cream Soda → Creamy Root Beer → Dr. Zevia → Vanilla Cola → Cran-Raspberry → Orange Creamsicle → Salted Caramel
- **Spawning**: After each move, a new Zevia can tile appears randomly in an empty space (90% chance Cola, 10% chance Ginger Ale)
- **Win Condition**: Reach the final Zevia product tier (or a specific target)
- **Loss Condition**: No more valid moves possible (board full with no adjacent matching tiles)

### Zevia Flavor Progression (Merging Tiers)
1. **Cola**
2. **Ginger Ale**
3. **Lemon Lime Twist**
4. **Orange**
5. **Grape**
6. **Black Cherry**
7. **Caffeine Free Cola**
8. **Cherry Cola**
9. **Cream Soda**
10. **Creamy Root Beer**
11. **Dr. Zevia**
12. **Vanilla Cola**
13. **Cran-Raspberry**
14. **Orange Creamsicle**
15. **Salted Caramel** (Final Goal!)

Two tiles of the same flavor combine into the next flavor in the progression. Reach Salted Caramel to win the game!

## Visual Design

### Tile Design
- Display flavor name prominently on each tile
- Use color-coded backgrounds representing each flavor:
  - Cola: Brown/tan
  - Ginger Ale: Light gold/beige
  - Lemon Lime Twist: Bright yellow-green
  - Orange: Vibrant orange
  - Grape: Purple
  - Black Cherry: Deep red
  - Caffeine Free Cola: Lighter brown
  - Cherry Cola: Crimson red
  - Cream Soda: Soft cream/white with color tint
  - Creamy Root Beer: Rich brown
  - Dr. Zevia: Dark copper/bronze
  - Vanilla Cola: Warm tan
  - Cran-Raspberry: Burgundy
  - Orange Creamsicle: Peachy orange
  - Salted Caramel: Golden caramel with shimmer effect
- Optional: Include stylized can imagery or Zevia branding on tiles
- Final tile (Salted Caramel) should have special animation/glow effect

### UI Elements
- **Score Display**: Show current score based on merges completed
- **Move Counter**: Track number of moves made
- **Best Score**: Display high score
- **Game Over/Win Screen**: Clear messaging with restart button
- **Control Instructions**: Display arrow key and WASD controls

### Color Scheme
- Zevia brand colors (consider their actual brand palette)
- Clean, modern interface
- Good contrast for readability

## Technical Requirements

### Technology Stack
- Recommend: HTML5, CSS3, JavaScript (vanilla or framework)
- Alternative: React, Vue, or similar for component-based approach

### Key Features
1. **Game State Management**
   - Track board state
   - Maintain score and move history
   - Support undo functionality (optional)

2. **Input Handling**
   - Keyboard arrow keys (direction control)
   - WASD key support
   - Prevent invalid moves

3. **Animation**
   - Tile sliding animations when moving
   - Merge animation when combining tiles
   - Spawn animation for new tiles
   - Scale/pop effects for merges

4. **Persistence**
   - Save high score to localStorage
   - Optional: Save game progress for resuming

5. **Display & Layout**
   - Clean, centered game board
   - Clear visibility of all UI elements
   - Proper spacing around the game grid

## Additional Features (Optional Enhancements)

- **Sound Effects**: Merge sounds, spawn sounds, game over sound
- **Statistics**: Track total tiles merged, games played, average score
- **Difficulty Modes**: 
  - Easy: New tiles spawn less frequently
  - Hard: Higher chance of four-packs spawning
- **Themes**: Light/dark mode toggle
- **Leaderboard**: Track top scores locally or via backend
- **Share Feature**: Share final score on social media
- **Custom Flavors**: Different Zevia flavors (grapefruit, passion fruit, etc.) as visual variations

## Acceptance Criteria

- [ ] Game successfully runs in web browsers
- [ ] All merging rules work correctly
- [ ] Scoring system functions properly
- [ ] Game over/win conditions trigger appropriately
- [ ] UI is intuitive and branded with Zevia theme
- [ ] Animations are smooth and performant
- [ ] High score persists between sessions
- [ ] Keyboard controls are responsive and working
- [ ] Game is fun and engaging to play

## File Structure (Recommended)

```
Zevia2048/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── game.js
│   ├── ui.js
│   └── utils.js
├── assets/
│   ├── images/
│   ├── sounds/
│   └── zevia-logos/
├── README.md
└── GAME_PROMPT.md
```

## GitHub Hosting & Deployment

### GitHub Pages Setup
- Create a GitHub repository named `Zevia2048`
- Push all project files to the main branch
- Enable GitHub Pages in repository settings:
  - Go to Settings → Pages
  - Set source to "main" branch and "/root" directory
  - Your game will be live at: `https://<your-username>.github.io/Zevia2048/`
- Ensure `index.html` is in the root directory for proper access

### Repository Structure
- Keep all files at the repository root or in clearly organized folders
- Update `README.md` with game instructions and link to the live site
- Include `.gitignore` for any build artifacts or dependencies

## Next Steps
1. Set up GitHub repository and enable GitHub Pages
2. Set up basic HTML structure with 4x4 grid
3. Implement game logic (movement, merging, spawning)
4. Create styling and visual design
5. Add animations and polish
6. Test in web browser
7. Commit and push to GitHub for live deployment
