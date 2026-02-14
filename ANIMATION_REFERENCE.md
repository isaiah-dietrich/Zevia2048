# Animation System - Quick Reference

## 30-Second Overview

**Problem Solved:** Smooth, glitch-free 2048 tile animations with proper sequencing and cleanup.

**Solution:** Three-phase render with explicit animation order + 1150ms cleanup buffer.

```
Move → Slide (0.9s) + Merge (0.9s) + Spawn (0.3s) → Cleanup (1150ms) → Ready
```

---

## Core Principles (Remember These!)

### 1. **requestAnimationFrame is Your Friend**
All DOM updates go inside a single RAF block:
```javascript
requestAnimationFrame(() => {
    // All DOM reads/writes here
    // Browser batches into one reflow
});
```

### 2. **Cleanup Timer Matches Animation Duration**
```javascript
// Longest animation: 0.9s = 900ms
// Safety buffer: 250ms
// Total: 1150ms
setTimeout(() => this.cleanupAnimations(), 1150);
```

### 3. **Reset Then Apply Classes**
```javascript
tile.className = 'tile';        // Reset first
tile.classList.add('sliding');  // Then apply
```

### 4. **Sequencing Matters**
```javascript
// 1st: Sliding (movement)
movedTiles.forEach(i => tiles.get(i).classList.add('sliding'));

// 2nd: Merging (pop effect)  
mergedTiles.forEach(i => tiles.get(i).classList.add('merging'));

// 3rd: Spawning (new tiles)
if (newTile) tiles.get(newTile).classList.add('spawning');
```

### 5. **Z-Index Prevents Overlap**
```css
.tile.sliding { z-index: 10; }  /* Bottom */
.tile.spawning { z-index: 15; } /* Middle */
.tile.merging { z-index: 20; }  /* Top */
```

---

## The Three Phases of render()

### Phase 1A: Reset DOM
```javascript
// Update all tiles with current game state
game.board.forEach((flavor, i) => {
    tile.dataset.flavor = flavor;
    tile.className = 'tile'; // Clean slate
});
```

### Phase 1B: Apply Animations
```javascript
// Sequential application prevents conflicts
movedTiles.forEach(i => tiles.get(i).classList.add('sliding'));
mergedTiles.forEach(i => tiles.get(i).classList.add('merging'));
if (newTile) tiles.get(newTile).classList.add('spawning');
```

### Phase 2: Cleanup
```javascript
// Wait for animations to complete
setTimeout(() => {
    this.cleanupAnimations(); // Remove classes, reset tracking
}, 1150);
```

---

## Animation Timings Reference

| Animation | Duration | Easing | Effect |
|-----------|----------|--------|--------|
| `.sliding` | 0.9s | cubic-bezier(0.25, 0.46, 0.45, 0.94) | Tile slides to position |
| `.merging` | 0.9s | cubic-bezier(0.34, 1.56, 0.64, 1) | Tile pops/scales up |
| `.spawning` | 0.3s | cubic-bezier(0.34, 1.56, 0.64, 1) | Tile fades/scales in |
| **Cleanup** | **1150ms** | — | Remove all animation classes |

---

## CSS Essentials

### Tile Base (Always Has These)
```css
.tile {
    will-change: transform, filter;
    transform: translate(0, 0) translateZ(0);
    backface-visibility: hidden;
    contain: layout style paint;
}
```

### Animation Classes
```css
.tile.sliding {
    transition: transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    z-index: 10;
}

.tile.merging {
    animation: merge 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    z-index: 20;
}

.tile.spawning {
    animation: spawn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    z-index: 15;
}
```

---

## Game Logic Responsibilities

### What Game State Tracks
```javascript
class Game {
    board = [];                // Current tile positions
    movedTiles = new Set();    // Indices of tiles that moved
    mergedTiles = new Set();   // Indices of tiles that merged
    newTile = null;            // Index of newly spawned tile
    boardBefore = [];          // Previous board state (for reference)
    score = 0;                 // Current score
}
```

### What move() Does
```javascript
move(direction) {
    // 1. Save previous state
    const boardBefore = this.board.slice();
    
    // 2. Update board (left/right/up/down)
    this.moveLeft(); // or moveRight, moveUp, moveDown
    
    // 3. Identify what changed
    this.trackAnimations(boardBefore);
    
    // 4. Add new tile
    this.newTile = this.addNewTile();
    
    // 5. Return if move was valid
    return JSON.stringify(boardBefore) !== JSON.stringify(this.board);
}
```

---

## UI Rendering Responsibilities

### What render() Does
```javascript
render() {
    // Phase 1: Update DOM
    requestAnimationFrame(() => {
        // Reset + apply animations in sequence
    });
    
    // Phase 2: Cleanup
    setTimeout(() => {
        this.cleanupAnimations();
    }, 1150);
}
```

### What NOT to Do
```javascript
// ❌ DON'T modify game state in UI
game.board[5] = 2; // NO!

// ❌ DON'T apply multiple animations simultaneously
tile.classList.add('sliding', 'merging', 'spawning'); // NO!

// ❌ DON'T use multiple requestAnimationFrame calls
requestAnimationFrame(() => { tile1.class... });
requestAnimationFrame(() => { tile2.class... }); // NO!

// ❌ DON'T cleanup animations early
setTimeout(() => removeClasses(), 500); // NO! Takes 900ms!
```

---

## Debugging Checklist

**Animations not playing?**
- [ ] Check CSS file has `@keyframes` defined
- [ ] Check class names match exactly (`.tile.sliding` vs `.sliding-tile`)
- [ ] Check will-change/GPU acceleration properties present

**Classes not removing?**
- [ ] Check cleanup timeout (1150ms correct?)
- [ ] Check requestAnimationFrame in cleanup
- [ ] Check classList.remove() called on right elements

**Tiles flickering?**
- [ ] Check z-index values (10, 15, 20)
- [ ] Check no overlapping transitions/animations
- [ ] Check GPU acceleration properties in place

**Performance issues?**
- [ ] Check DevTools Performance tab
- [ ] Look for layout thrashing (multiple reflows)
- [ ] Verify single requestAnimationFrame used

**Merge showing duplicates?**
- [ ] Check mergedTiles correctly identified in trackAnimations()
- [ ] Check DOM cleanup removes all old tiles
- [ ] Check z-index prevents visual overlap

---

## File Locations & Modifications

```
/Zevia2048/
├── js/
│   ├── game.js ✏️  (move(), trackAnimations(), reset())
│   ├── ui.js ✏️    (render(), cleanupAnimations())
│   └── utils.js
├── css/
│   └── style.css ✏️  (Animation classes, z-index, @keyframes)
├── index.html
├── ANIMATION_SYSTEM.md      📝 (Detailed documentation)
├── CODE_PATTERNS.md         📝 (Example patterns)
├── FIX_SUMMARY.md          📝 (What was fixed)
└── ANIMATION_REFERENCE.md   📝 (This file)
```

---

## Testing Steps

### Quick Smoke Test
```
1. Open game in browser
2. Press LEFT arrow
3. Tiles should slide smoothly (not snap)
4. When two tiles merge, should see one smooth pop effect
5. New tile should fade/scale in gently
```

### Full Test Suite
```
1. Tile Movement ✓
   - All 4 directions work smoothly

2. Merge Effect ✓
   - Two same tiles combine with pop
   - Only ONE tile remains
   - Correct flavor/value shown

3. Spawn Animation ✓
   - New tiles appear with fade-in
   - Not instant
   - Smooth 0.3s animation

4. Rapid Input ✓
   - Press keys rapidly
   - No glitches
   - Moves queue properly

5. Game End ✓
   - Win screen displays smoothly
   - Board dims with transition
   - Modal pops in

6. Performance ✓
   - DevTools shows 60fps
   - No jank/stuttering
   - Smooth playback
```

---

## Magic Numbers Explained

| Value | Purpose | Formula |
|-------|---------|---------|
| `0.9s` | Slide duration | Standard smooth animation timing |
| `0.3s` | Spawn duration | Quick appearance for new tiles |
| `900ms` | Longest animation | 0.9s in milliseconds |
| `250ms` | Safety buffer | Accounts for rounding/browser quirks |
| `1150ms` | Cleanup timeout | 900 + 250 = safe window |
| `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Slide easing | Natural acceleration curve |
| `cubic-bezier(0.34, 1.56, 0.64, 1)` | Pop easing | Bouncy/springy effect |
| z-index `10, 15, 20` | Stacking order | Prevents overlap during animations |

---

## If Something Goes Wrong

### Issue: Tiles not moving
**Check:** Are `.sliding` animations playing? Check DevTools → Elements → .tile element should get `.sliding` class

### Issue: Animations freeze mid-way
**Check:** Is cleanup timeout removing classes too early? Should be 1150ms minimum

### Issue: Merged tiles both visible
**Check:** Are z-index values set correctly? Merged tile should have z-index: 20

### Issue: New tiles appear instantly
**Check:** Is `.spawning` animation applied? Should see 0.3s scale animation

### Issue: Performance drops to 30fps
**Check:** Are DOM updates batched in requestAnimationFrame? Should not have multiple RAFs

### Issue: Rapid input causes glitches
**Check:** Does game.move() prevent invalid moves? Should return false if gameOver/won

---

## Key Insight

**The core fix is separating concerns:**
- **Game** = State only
- **UI** = Rendering only  
- **CSS** = Animation only

Each layer does ONE job and does it well. No mixing responsibilities = no bugs.

---

## Stay Updated

When modifying animation timing:
1. Change `0.9s` in CSS? Update `900ms` in JavaScript cleanup
2. Change spawn duration? Update if longer than 900ms
3. Add new animation class? Add to cleanup removal list
4. Change z-index values? Keep them separated (10, 15, 20)

Keep this file in sync with actual code! 📝
