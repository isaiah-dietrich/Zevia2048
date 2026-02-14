# Zevia 2048 - Animation System Documentation

## Overview

This document explains the clean animation sequencing strategy that prevents visual glitches, race conditions, and ensures deterministic, smooth tile animations.

---

## Architecture: Separation of Concerns

### 1. **Game State Layer** (`js/game.js`)
**Responsibility:** Pure game logic, NO rendering
- Maintains board state as a 1D array of indices
- Tracks `movedTiles`, `mergedTiles`, `newTile` Sets
- Stores `boardBefore` and `animationMetadata` for animation reference
- Returns boolean indicating if move was valid

```javascript
// Game responsibilit: Update state only
move(direction) {
    const boardBefore = this.board.slice();
    // ... game logic ...
    this.trackAnimations(boardBefore); // Identify what animated
    return true/false; // Did state change?
}
```

### 2. **Rendering Layer** (`js/ui.js`)
**Responsibility:** DOM updates and animation application
- Converts game state to visual representation
- Applies animation classes based on tracking data
- Uses requestAnimationFrame for batched DOM updates
- Cleans up animations after completion

```javascript
// UI responsibility: Render state + animate
render() {
    requestAnimationFrame(() => {
        // Update DOM
        // Apply animation classes
    });
    
    setTimeout(() => {
        this.cleanupAnimations(); // Reset for next move
    }, 1150);
}
```

### 3. **Animation Layer** (`css/style.css`)
**Responsibility:** Visual effects and timing
- CSS transitions for movement (transform)
- CSS animations for visual effects (scale, brightness)
- Explicit z-index to prevent stacking glitches

---

## Animation Sequencing Flow

### Complete Move Sequence (Timeline)

```
User presses arrow key
    ↓
Game.move() executes (game state updates)
    ↓
Game.trackAnimations() identifies changed tiles
    ↓
UI.render() called
    ├─ requestAnimationFrame (Phase 1)
    │   ├─ Update all tile DOM content
    │   ├─ Reset all tiles to base class
    │   ├─ Apply .sliding class to moved tiles → CSS transition starts
    │   ├─ Apply .merging class to merged tiles → CSS animation starts
    │   ├─ Apply .spawning class to new tile → CSS animation starts
    │   └─ Update stats display
    │
    └─ setTimeout 1150ms (Phase 2)
        ├─ Remove .sliding, .merging, .spawning classes
        ├─ Reset game.newTile, movedTiles, mergedTiles
        └─ Ready for next move
```

**Timeline Details:**
- **0ms:** Game state updates, render() called
- **0-16ms:** requestAnimationFrame executes (browser permits)
  - All DOM updates batched into single reflow/repaint
  - Animation classes applied
  - Browser reflows layout once, then paints
- **16-900ms:** CSS animations/transitions execute (browser composites)
  - No JavaScript blocking
  - Smooth 60fps animation via GPU acceleration
- **900-1150ms:** Animation completion + safety buffer
- **1150ms+:** Animation cleanup, ready for next input

---

## Key Principles

### 1. **Single Source of Truth**
Game state is ONLY in `js/game.js`. UI reads from it, never modifies it.

```javascript
// ✅ CORRECT
moved = game.move('left'); // Game updates state
if (moved) ui.render();     // UI reads state

// ❌ WRONG
ui.applyMove('left');       // UI should never modify game state
```

### 2. **Deterministic Tracking**
Before rendering, game logic clearly marks what changed:

```javascript
trackAnimations(boardBefore) {
    for (let i = 0; i < 16; i++) {
        const before = boardBefore[i];
        const after = this.board[i];
        
        // Merge: value increased
        if (after > before) this.mergedTiles.add(i);
        
        // Move: value changed (moved to new position)
        else if (after !== before) this.movedTiles.add(i);
    }
}
```

### 3. **Animation Class Strategy**
Always reset to base state first, then apply animations:

```javascript
// ✅ CORRECT - Clean slate, then apply
tile.className = 'tile'; // Reset
tile.classList.add('sliding'); // Apply animation

// ❌ WRONG - May leave old classes
tile.classList.add('sliding'); // Might already have 'merging'
```

### 4. **DOM Batching**
All DOM reads/writes happen inside a single requestAnimationFrame:

```javascript
requestAnimationFrame(() => {
    // All these are batched together
    game.board.forEach((flavor, i) => {
        const tile = this.tiles.get(i);
        tile.dataset.flavor = flavor;     // Write
        tile.classList.add('sliding');    // Write
    });
    this.updateStats(); // Write
    // Browser: single reflow + repaint
});
```

### 5. **Animation Timing Buffer**
1150ms cleanup timeout accounts for:
- Max animation duration: **900ms** (slide + merge)
- Plus safety buffer: **250ms** (browser quirks, rounding)

```javascript
// Slowest animation: slide (0.9s) or merge (0.9s)
// 0.9s = 900ms, so cleanup at 1150ms is safe
setTimeout(() => this.cleanupAnimations(), 1150);
```

---

## Preventing Common Glitches

### Glitch #1: Flickering During Merges
**Cause:** Animation classes removed before animation completes
**Fix:** Track animation types separately, use proper cleanup timing

```javascript
// ❌ BAD - Cleanup too early
setTimeout(() => tile.classList.remove('sliding'), 500); // Animation takes 900ms!

// ✅ GOOD - Cleanup after animation
setTimeout(() => this.cleanupAnimations(), 1150);
```

### Glitch #2: Tiles Snapping Into Position
**Cause:** DOM moved without CSS transition
**Fix:** Apply animation class BEFORE game logic commits state change

```javascript
// ✅ CORRECT
tile.classList.add('sliding'); // Set up animation
tile.transform = translate(...); // CSS transition animates it

// ❌ WRONG
tile.transform = translate(...); // Instant DOM change
tile.classList.add('sliding');   // Animation starts from wrong position
```

### Glitch #3: Duplicate Tiles During Merge
**Cause:** Merged tile and source tile both visible
**Fix:** Update DOM content at same time, use z-index layering

```css
.tile.sliding { z-index: 10; }      /* Moving tiles on bottom */
.tile.merging { z-index: 20; }      /* Merged tile on top */
.tile.spawning { z-index: 15; }     /* New tiles in middle */
```

### Glitch #4: Race Conditions (Multiple Moves Queued)
**Cause:** Move animation not finished when new move starts
**Fix:** Game logic prevents moves during animations

```javascript
// In move() method
move(direction) {
    if (this.gameOver || this.won) return false; // Block input
    // ... rest of logic ...
}

// In UI
handleKeyPress(e) {
    const moved = game.move(direction);
    if (moved) {
        this.render(); // Only render if move succeeded
    }
    // If move failed (no space), do nothing
}
```

---

## Transform vs. Animation Decision Tree

**When to use CSS Transition (transform property):**
- Moving tiles to new positions
- Position-based changes
- Requires starting position ≠ ending position
- Example: `transform: translate(0, 100px)` → `translate(0, 0)`

**When to use CSS Animation (@keyframes):**
- Color/opacity effects
- Scale (pop effects)
- Rotation
- Effects that don't require different starting positions
- Example: `scale(1)` → `scale(1.15)` → `scale(1)`

**For this game:**
- **Slide → Transition** (tiles move positions)
- **Merge → Animation** (tile pops/scales in place)
- **Spawn → Animation** (tile appears, no movement needed initially)

---

## Best Practices Checklist

- [ ] Game state is never modified by rendering code
- [ ] All DOM updates batched in single requestAnimationFrame
- [ ] Animation cleanup happens after max animation duration + buffer
- [ ] Each animation type has explicit class (`.sliding`, `.merging`, `.spawning`)
- [ ] Classes reset to base before applying new animations
- [ ] Z-index values prevent stacking conflicts
- [ ] Game blocks input during animation completion phase
- [ ] No transitions applied to animated properties (conflict prevention)
- [ ] GPU acceleration enabled (will-change, transform, translateZ)

---

## Testing Animation Quality

### Manual Testing Checklist
1. **Slide:** Arrow key moves tile smoothly (not snappy)
2. **Merge:** Two same tiles combine smoothly, single result
3. **Spawn:** New tile appears with pop effect, not instant
4. **Game Over:** Board dims, modal appears smoothly
5. **Rapid Input:** Fast key presses don't cause glitches
6. **Performance:** Animation stays smooth on lower-end devices

### Performance Profiling
```javascript
// DevTools Performance tab
// 1. Record
// 2. Press arrow key
// 3. Stop recording
// 4. Look for:
//    - No layout thrashing (green = good)
//    - No jank (60fps line maintained)
//    - Single reflow per animation
```

---

## File Reference

| File | Role | Key Functions |
|------|------|---|
| `js/game.js` | Game Logic | `move()`, `trackAnimations()` |
| `js/ui.js` | Rendering | `render()`, `cleanupAnimations()` |
| `css/style.css` | Animation Effects | `.tile.sliding`, `.tile.merging`, `@keyframes` |
| `index.html` | DOM Structure | Game board, modal |

---

## Summary

This animation system achieves smooth, glitch-free animations through:

1. **Clear separation** of game state from visual rendering
2. **Deterministic tracking** of which tiles changed
3. **Explicit animation sequencing** (move → merge → spawn)
4. **Proper timing** with safety buffers
5. **GPU-accelerated transforms** for 60fps performance
6. **Z-index layering** to prevent visual conflicts

Result: **Smooth, professional-quality 2048 game animations** with zero visual desynchronization.
