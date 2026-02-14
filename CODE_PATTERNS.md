# Animation System - Example Code Patterns

## Pattern 1: Clean Animation Class Management

### ❌ Problem Code (Causes Glitches)
```javascript
// Classes accumulate, animations conflict
tile.classList.add('sliding');
tile.classList.add('merging');
// Later: doesn't fully remove old classes
tile.classList.remove('sliding');
// Result: Tile appears to be stuck in merging state
```

### ✅ Solution: Reset Then Apply
```javascript
// Always start with base class
tile.className = 'tile'; // Wipe all animation classes

// Then add only what's needed
if (isMoving) tile.classList.add('sliding');
if (isMerging) tile.classList.add('merging');
if (isSpawning) tile.classList.add('spawning');
```

---

## Pattern 2: Batch DOM Updates

### ❌ Problem Code (Layout Thrashing)
```javascript
game.board.forEach((flavor, i) => {
    const tile = this.tiles.get(i);
    tile.dataset.flavor = flavor;     // Browser reflow
    tile.classList.add('sliding');    // Browser repaint
    // ...each tile causes separate reflow!
});
// Result: Jank, 30fps instead of 60fps
```

### ✅ Solution: Batch Updates
```javascript
requestAnimationFrame(() => {
    game.board.forEach((flavor, i) => {
        const tile = this.tiles.get(i);
        tile.dataset.flavor = flavor;
        tile.classList.add('sliding');
    });
    // Single reflow + repaint for all tiles
});
```

---

## Pattern 3: Proper Cleanup Timing

### ❌ Problem Code (Animations Cut Off)
```javascript
// Bad timing - cleanup too early
setTimeout(() => {
    tile.classList.remove('sliding'); // Animation still playing!
}, 300); // But .sliding animation takes 0.9s!
```

### ✅ Solution: Match Animation Duration
```javascript
// Cleanup after longest animation plus buffer
const ANIMATION_DURATION = 0.9; // 900ms
const SAFETY_BUFFER = 0.25;      // 250ms
const CLEANUP_TIME = (ANIMATION_DURATION + SAFETY_BUFFER) * 1000; // 1150ms

setTimeout(() => {
    this.cleanupAnimations();
}, CLEANUP_TIME);
```

---

## Pattern 4: Animation Sequencing

### ❌ Problem Code (No Sequence)
```javascript
// Everything animates at same time - confusing
tile1.classList.add('sliding', 'merging', 'spawning');
// What order? Which takes priority? Undefined behavior
```

### ✅ Solution: Explicit Sequence
```javascript
// Phase 1: Sliding (movement)
movedTiles.forEach(i => {
    this.tiles.get(i).classList.add('sliding');
});

// Phase 2: Merging (now that everything's in place)
mergedTiles.forEach(i => {
    this.tiles.get(i).classList.add('merging');
});

// Phase 3: Spawning (after phase 1-2 complete)
if (newTile !== null) {
    this.tiles.get(newTile).classList.add('spawning');
}
```

---

## Pattern 5: Preventing Race Conditions

### ❌ Problem Code (Double-Move Bug)
```javascript
// User presses arrow twice quickly
handleKeyPress(e) {
    const moved = game.move('left');
    this.render();
    // Animation still playing...
    // User presses again immediately
    const moved2 = game.move('right'); // State corrupted!
}
```

### ✅ Solution: Block Input During Animation
```javascript
private isAnimating = false;

handleKeyPress(e) {
    if (this.isAnimating) return; // Ignore input
    
    const moved = game.move(direction);
    if (moved) {
        this.isAnimating = true;
        this.render();
        
        setTimeout(() => {
            this.isAnimating = false; // Re-enable input
        }, 1150);
    }
}
```

Or let game handle it:
```javascript
// In Game class
canMove() {
    // Prevents moves during animation completion
    if (this.gameOver || this.won) return false;
    // ... rest of logic ...
}
```

---

## Pattern 6: CSS Transition vs. Animation

### ❌ Problem: Transition + Animation Conflict
```css
.tile.sliding {
    transition: transform 0.9s ease-out;  /* Move to position */
}

.tile.merging {
    animation: merge 0.9s ease-out;       /* Pop in place */
}

.tile.sliding.merging {
    /* Which one wins? Undefined! */
}
```

### ✅ Solution: Explicit State
```css
/* Transition for movement (position-based) */
.tile.sliding {
    transition: transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    z-index: 10;
}

/* Animation for visual effects (stays in place) */
.tile.merging {
    animation: merge 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    z-index: 20; /* Appears above others */
}

/* Both can coexist - animation doesn't interfere with transition */
.tile.sliding.merging {
    transition: transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    animation: merge 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
```

---

## Pattern 7: State Validation

### ❌ Problem: Invalid State Combinations
```javascript
// What if a tile is spawning AND merging? Not possible!
tile.classList.add('spawning');
tile.classList.add('merging');
```

### ✅ Solution: Mutual Exclusivity
```javascript
// Each tile is in exactly ONE state
if (isNewSpawn) {
    tile.classList.add('spawning');
} else if (isMerged) {
    tile.classList.add('merging');
} else if (isMoved) {
    tile.classList.add('sliding');
}
// Can't be both - logic prevents it
```

---

## Pattern 8: Using requestAnimationFrame Correctly

### ❌ Problem Code
```javascript
// Multiple rafs - unpredictable timing
requestAnimationFrame(() => {
    tile1.classList.add('sliding');
});

requestAnimationFrame(() => {
    tile2.classList.add('sliding');
});
// Both could run in different frames, inconsistent timing
```

### ✅ Solution: Single RAF for All
```javascript
requestAnimationFrame(() => {
    // All DOM updates in single frame
    tiles.forEach(tile => {
        tile.className = 'tile';
        if (needsSlide(tile)) tile.classList.add('sliding');
    });
    // Browser batches all changes, single reflow
});
```

---

## Pattern 9: GPU Acceleration

### ✅ Best Practice: Enable GPU
```css
.tile {
    /* Use will-change sparingly, for animated properties */
    will-change: transform, filter;
    
    /* Initialize with 3D transform for GPU acceleration */
    transform: translate(0, 0) translateZ(0);
    
    /* Hardware acceleration hints */
    backface-visibility: hidden;
    -webkit-font-smoothing: antialiased;
    
    /* Optimization: contain layout calculations */
    contain: layout style paint;
    perspective: 1000;
}
```

### Why It Matters:
- **translateZ(0)**: Promotes to GPU layer
- **will-change**: Tells browser to prepare GPU resources
- **contain**: Tells browser this element won't affect layout outside itself
- **Result**: 60fps animation, not 30fps JavaScript animation

---

## Pattern 10: Complete Move Sequence

### Full Example
```javascript
// ==== GAME STATE ====
// User presses 'left'

// ==== GAME LOGIC ====
const moved = game.move('left');
if (!moved) return; // Invalid move, do nothing

// ==== RENDERING ====
requestAnimationFrame(() => {
    // Step 1: Update all tiles with new state
    game.board.forEach((flavor, i) => {
        const tile = this.tiles.get(i);
        tile.dataset.flavor = game.getFlavorName(flavor);
        tile.className = 'tile'; // Reset all classes
    });
    
    // Step 2: Apply animations by category
    // Sliding: tiles moving to new position
    game.movedTiles.forEach(i => {
        this.tiles.get(i).classList.add('sliding');
    });
    
    // Merging: tiles combining (happens at final position)
    game.mergedTiles.forEach(i => {
        this.tiles.get(i).classList.add('merging');
    });
    
    // Spawning: new tile appearing
    if (game.newTile !== null) {
        this.tiles.get(game.newTile).classList.add('spawning');
    }
    
    // Step 3: Update UI
    this.updateStats();
});

// ==== CLEANUP ====
setTimeout(() => {
    // Remove all animation classes
    this.tiles.forEach(tile => {
        tile.classList.remove('sliding', 'merging', 'spawning');
    });
    
    // Reset animation tracking
    game.newTile = null;
    game.movedTiles.clear();
    game.mergedTiles.clear();
}, 1150); // Max animation time + buffer
```

---

## Debugging Glitches

### Check 1: Are Animations Playing at All?
```javascript
// Add to browser console
document.querySelector('.tile').classList.add('sliding');
// If tile moves: animations work
// If nothing: check CSS animations exist
```

### Check 2: Is Cleanup Removing Classes?
```javascript
// Monitor tile classes
const tile = document.querySelector('.tile');
setInterval(() => {
    console.log(tile.className); // Should show class changes
}, 100);
```

### Check 3: Is DOM Updating Correctly?
```javascript
// Check game state vs DOM
console.log("Game board:", game.board);
document.querySelectorAll('.tile').forEach((tile, i) => {
    console.log(`Tile ${i}:`, tile.dataset.flavor);
});
```

### Check 4: Performance Issues?
```javascript
// Open DevTools Performance tab
// Record a move
// Look for:
// - Red sections = jank
// - Multiple tall bars = layout thrashing
// - Smooth 60fps line = good
```

---

## Summary of Patterns

| Pattern | Purpose | Key Point |
|---------|---------|-----------|
| Reset then apply | Clean animation state | Always `.className = 'tile'` first |
| Batch DOM updates | Reduce reflows | Use single `requestAnimationFrame` |
| Proper cleanup timing | Animations complete | `1150ms = 900ms + 250ms buffer` |
| Explicit sequencing | Deterministic order | Move → Merge → Spawn |
| Input blocking | Prevent race conditions | Ignore input during animation |
| CSS transition vs animation | Choose the right tool | Transition = movement, Animation = effects |
| State validation | Prevent impossible states | Opposite: if-else logic |
| Single RAF | Batched updates | Loop through all tiles in one RAF |
| GPU acceleration | 60fps performance | `translateZ(0)`, `will-change`, `contain` |
| Complete sequence | Full move workflow | Game logic → Render → Cleanup |
