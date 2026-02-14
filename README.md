# Zevia 2048 - Flavor Fusion Game

A fun, interactive 2048-style puzzle game featuring Zevia soda flavors! Combine tiles to progress through the Zevia flavor lineup and reach the ultimate goal: Ginger Root Beer.

## 🎮 Play Now

Visit the live game: [https://isaiahdietrich.github.io/Zevia2048/]((https://isaiah-dietrich.github.io/Zevia2048/))

## 📋 Game Rules

- **Objective**: Reach the Ginger Root Beer tile to win! (Then continue playing if you like)
- **Movement**: Use Arrow Keys (↑↓←→) or WASD to move tiles
- **Merging**: Two tiles with the same flavor combine into the next flavor in the progression
- **Spawning**: New tiles appear after each move (90% Cola, 10% Ginger Ale)
- **Game Over**: When no more moves are possible, the game ends

## 🍾 Flavor Progression

The game features a 15-flavor progression:

1. Cola
2. Dr. Zevia
3. Ginger Ale
4. Black Cherry
5. Lemon Lime Twist
6. Orange
7. Grape
8. Cream Soda
9. Cherry Cola
10. Creamy Root Beer
11. **Ginger Root Beer** (Victory!)
12. Cran-Raspberry
13. Vanilla Cola
14. Salted Caramel
15. Orange Creamsicle

## 🎨 Features

- ✨ Beautiful, colorful UI with flavor-specific tile colors
- 📊 Real-time score and move counter
- 🏆 Best score tracking (saved locally)
- 🎯 Win/Game Over modals with game status
- ⌨️ Keyboard controls (Arrow Keys & WASD support)
- 📱 Responsive design
- 🎬 Smooth animations for tile movements and merges

## 🛠️ Technical Stack

- **HTML5** - Game structure and layout
- **CSS3** - Styling with animations and gradients
- **Vanilla JavaScript** - Game logic and UI management

## 📁 Project Structure

```
Zevia2048/
├── index.html          # Main game page
├── css/
│   └── style.css       # All styling and animations
├── js/
│   ├── game.js         # Game logic and board state
│   ├── ui.js           # UI rendering and user interactions
│   └── utils.js        # Utility helper functions
├── assets/
│   ├── images/         # Image assets (future)
│   ├── sounds/         # Audio assets (future)
│   └── zevia-logos/    # Brand logos (future)
├── README.md           # This file
└── GAME_PROMPT.md      # Original development prompt
```

## 🚀 Getting Started

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/isaiahdietrich/Zevia2048.git
   cd Zevia2048
   ```

2. Open in your browser:
   ```bash
   # Simply open index.html in your web browser
   open index.html
   ```

3. Start playing!

### Deploying to GitHub Pages

1. Push your changes to GitHub:
   ```bash
   git push origin main
   ```

2. Enable GitHub Pages in your repository settings:
   - Go to Settings → Pages
   - Set source to "main" branch and "/root" directory
   - Your game will be live at: `https://<your-username>.github.io/Zevia2048/`

## 📈 Game Statistics

- **Score**: Points earned from merging tiles
- **Moves**: Total number of moves made
- **Best Score**: Highest score achieved (persisted locally)

Scores are calculated based on the flavor index when tiles merge. Higher tier flavors give more points!

## 🎯 Tips & Strategies

- Try to keep high-value tiles in the corners
- Plan ahead - think about where new tiles will spawn
- Keep larger tiles towards one side to make room for new spawns
- Focus on creating clusters of the same flavor to merge efficiently

## 🔮 Future Enhancements

- [ ] Sound effects for moves, merges, and game events
- [ ] Game statistics (total tiles merged, games played, etc.)
- [ ] Difficulty modes (Easy, Normal, Hard)
- [ ] Light/Dark theme toggle
- [ ] Leaderboard system
- [ ] Undo move functionality
- [ ] Social media sharing
- [ ] Mobile app version

## 🤝 Contributing

Have ideas for improvements? Feel free to:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🙋 Support

If you encounter any issues or have suggestions, please open an issue on GitHub!

---

**Created with ❤️ for Zevia soda lovers everywhere!**
