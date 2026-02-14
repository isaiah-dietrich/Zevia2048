// ==================== UI Controller ====================
class UI {
    constructor() {
        this.gameBoard = document.getElementById('game-board');
        this.scoreDisplay = document.getElementById('score');
        this.movesDisplay = document.getElementById('moves');
        this.bestScoreDisplay = document.getElementById('best-score');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.continueBtn = document.getElementById('continue-btn');
        this.newGameBtnModal = document.getElementById('new-game-btn-modal');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.finalScoreDisplay = document.getElementById('final-score');

        this.tiles = new Map(); // Map index to DOM element
        this.previousBoardState = []; // Track previous state for animations
        this.isAnimating = false;
        this.animationTimers = [];
        this.animationLockTimer = null;
        this.pendingDirections = [];
        this.debug = false; // set to true to enable origin->target logging
        this.flavorImagePaths = [
            'assets/images/cola.webp',
            'assets/images/dr-zevia.webp',
            'assets/images/ginger-ale.webp',
            'assets/images/black-cherry.webp',
            'assets/images/lemon-lime.webp',
            'assets/images/orange.webp',
            'assets/images/grape.webp',
            'assets/images/cream-soda.webp',
            'assets/images/cherry-cola.webp',
            'assets/images/creamy-root-beer.webp',
            'assets/images/ginger-root-beer.webp',
            'assets/images/cran-raspberry.webp',
            'assets/images/vanilla-cola.webp',
            'assets/images/salted-caramel.webp',
            'assets/images/orange-creamsicle.webp'
        ];

        this.loadBestScore();
        this.preloadFlavorImages();
        this.initEventListeners();
        this.initializeBoard();
        this.render();
    }

    preloadFlavorImages() {
        this.flavorImagePaths.forEach((path) => {
            const img = new Image();
            img.src = path;
            if (typeof img.decode === 'function') {
                img.decode().catch(() => {
                    // Ignore decode failures; browser will still fetch/cache image bytes.
                });
            }
        });
    }

    // Initialize board tiles once
    initializeBoard() {
        this.gameBoard.innerHTML = '';
        this.tiles.clear();

        // Create all 16 tile elements
        for (let i = 0; i < 16; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.index = i;
            tile.style.transform = 'translate(0, 0)';
            tile.style.opacity = '1';
            this.gameBoard.appendChild(tile);
            this.tiles.set(i, tile);
        }
    }

    // Initialize event listeners
    initEventListeners() {
        // Button clicks
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.continueBtn.addEventListener('click', () => this.hideGameEnd());
        this.newGameBtnModal.addEventListener('click', () => this.newGame());

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    // Handle keyboard input
    handleKeyPress(e) {
        let direction = null;

        switch (e.key.toLowerCase()) {
            case 'arrowup':
            case 'w':
                direction = 'up';
                e.preventDefault();
                break;
            case 'arrowdown':
            case 's':
                direction = 'down';
                e.preventDefault();
                break;
            case 'arrowleft':
            case 'a':
                direction = 'left';
                e.preventDefault();
                break;
            case 'arrowright':
            case 'd':
                direction = 'right';
                e.preventDefault();
                break;
        }

        if (direction) {
            if (this.isAnimating) {
                this.pendingDirections.push(direction);
                // If new input arrives mid-animation, finish current visual phase now.
                this.cleanupAnimations();
                return;
            }
            this.executeMove(direction);
        }
    }

    executeMove(direction) {
        const moved = game.move(direction);
        if (!moved) return false;

        this.isAnimating = true;
        this.render();
        this.checkGameEnd();
        this.startAnimationWatchdog();
        return true;
    }

    startAnimationWatchdog() {
        if (this.animationLockTimer) clearTimeout(this.animationLockTimer);
        this.animationLockTimer = setTimeout(() => {
            if (this.isAnimating) this.cleanupAnimations();
        }, 1200);
    }

    flushPendingDirection() {
        if (this.isAnimating || this.pendingDirections.length === 0) return;
        const nextDirection = this.pendingDirections.shift();
        this.executeMove(nextDirection);
    }

    clearAnimationTimers() {
        this.animationTimers.forEach((timer) => clearTimeout(timer));
        this.animationTimers = [];
    }

    // Render the game board with proper animation sequencing
    render() {
        const SLIDE_MS = 170;
        const SETTLE_MS = 30;
        const MERGE_MS = 180;
        const CLEANUP_BUFFER = 90;
        const hasPendingSpawn = game.newTile !== null && game.newTile !== undefined;
        const boardNow = game.board.slice();
        const boardForMotion = hasPendingSpawn && game.boardAfterMove?.length === 16
            ? game.boardAfterMove.slice()
            : boardNow.slice();
        const originFor = new Map();

        for (let i = 0; i < 16; i++) {
            if (boardForMotion[i] !== null && boardForMotion[i] !== undefined) {
                originFor.set(i, i);
            }
        }

        if (Array.isArray(game.animationMetadata?.moves)) {
            game.animationMetadata.moves.forEach(({ from, to }) => {
                if (!originFor.has(to)) return;
                if (originFor.get(to) === to && from !== to) {
                    originFor.set(to, from);
                }
            });
        }

        this.clearAnimationTimers();
        requestAnimationFrame(() => {
            // Layout metrics
            const sample = this.tiles.get(0);
            const tileRect = sample.getBoundingClientRect();
            const tileSize = Math.round(tileRect.width);
            const gapStr = window.getComputedStyle(this.gameBoard).getPropertyValue('gap') || window.getComputedStyle(this.gameBoard).getPropertyValue('grid-gap') || '10px';
            const gap = parseInt(gapStr, 10) || 10;
            const stride = tileSize + gap;

            // Debug logging: origin -> target assignments and moved/merged sets
            if (this.debug) {
                try {
                    console.groupCollapsed('UI Animation Mapping');
                    console.log('movedTiles:', Array.from(game.movedTiles));
                    console.log('mergedTiles:', Array.from(game.mergedTiles));
                    console.log('originFor (target -> origin):');
                    for (const [t, o] of originFor.entries()) {
                        console.log(` target ${t} <= origin ${o}`);
                    }
                    console.groupEnd();
                } catch (e) {
                    console.error('Debug log failed', e);
                }
            }

            // Place tiles at their final DOM slots but visually at their origin
            boardForMotion.forEach((flavorIndex, i) => {
                const tile = this.tiles.get(i);
                if (!tile) return;
                const isSpawnTile = hasPendingSpawn && i === game.newTile && boardNow[i] !== null && boardNow[i] !== undefined;

                // Reset classes and content
                tile.className = 'tile';
                tile.classList.remove('empty');
                tile.style.opacity = '1';
                tile.style.transform = 'translate3d(0, 0, 0)';
                tile.dataset.spawnFlavor = '';

                if (isSpawnTile) {
                    const spawnFlavor = game.getFlavorName(boardNow[i]);
                    tile.classList.add('empty');
                    tile.dataset.flavor = '';
                    tile.textContent = '';
                    tile.dataset.spawnFlavor = spawnFlavor;
                } else if (flavorIndex !== null && flavorIndex !== undefined) {
                    const flavor = game.getFlavorName(flavorIndex);
                    tile.dataset.flavor = flavor;
                    tile.textContent = flavor;

                    const originIdx = originFor.get(i);
                    if (originIdx !== undefined && originIdx !== i) {
                        const oc = { row: Math.floor(originIdx / 4), col: originIdx % 4 };
                        const tc = { row: Math.floor(i / 4), col: i % 4 };
                        const dx = (oc.col - tc.col) * stride;
                        const dy = (oc.row - tc.row) * stride;
                        tile.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
                    }
                } else {
                    tile.classList.add('empty');
                    tile.textContent = '';
                    tile.dataset.flavor = '';
                }
            });

            // Force starting transforms to apply
            this.gameBoard.offsetHeight;

            // Start all slides at the same time (fixed duration)
            game.movedTiles.forEach((i) => {
                const tile = this.tiles.get(i);
                if (!tile) return;
                tile.classList.add('sliding');
                // Trigger to final position
                tile.style.transform = 'translate3d(0, 0, 0)';
            });

            // Run follow-up phases only after animations that actually exist.
            const hasSlides = game.movedTiles.size > 0;
            const hasMerges = game.mergedTiles.size > 0;
            const slideCompleteDelay = hasSlides ? (SLIDE_MS + SETTLE_MS) : 0;
            const mergeTimer = setTimeout(() => {
                game.mergedTiles.forEach((i) => {
                    const tile = this.tiles.get(i);
                    if (tile) tile.classList.add('merging');
                });
            }, slideCompleteDelay);
            this.animationTimers.push(mergeTimer);

            // Spawn after merge only when merge animation is present.
            const mergeCompleteDelay = hasMerges ? MERGE_MS : 0;
            const spawnDelay = slideCompleteDelay + mergeCompleteDelay;
            const spawnTimer = setTimeout(() => {
                if (game.newTile !== null && game.newTile !== undefined) {
                    const tile = this.tiles.get(game.newTile);
                    if (tile) {
                        const spawnFlavor = tile.dataset.spawnFlavor || game.getFlavorName(game.board[game.newTile]);
                        tile.classList.remove('empty');
                        tile.dataset.flavor = spawnFlavor;
                        tile.textContent = spawnFlavor;
                        tile.dataset.spawnFlavor = '';
                        tile.classList.add('spawning');
                    }
                }
            }, spawnDelay);
            this.animationTimers.push(spawnTimer);

            // Final cleanup after all animations
            const cleanupAfter = spawnDelay + CLEANUP_BUFFER;
            const cleanupTimer = setTimeout(() => this.cleanupAnimations(), cleanupAfter);
            this.animationTimers.push(cleanupTimer);

            // Update stats and stash previous board
            this.updateStats();
            this.previousBoardState = boardNow.slice();
        });
    }

    // Remove animation classes and reset state
    cleanupAnimations() {
        // Use RAF to batch this DOM operation
        requestAnimationFrame(() => {
            this.tiles.forEach((tile) => {
                // Remove all animation classes
                tile.classList.remove('sliding', 'spawning', 'merging');
            });
        });

        // Reset game animation tracking
        game.newTile = null;
        game.movedTiles.clear();
        game.mergedTiles.clear();
        game.animationMetadata = { moves: [], merges: [] };
        this.isAnimating = false;
        if (this.animationLockTimer) {
            clearTimeout(this.animationLockTimer);
            this.animationLockTimer = null;
        }
        this.clearAnimationTimers();
        this.flushPendingDirection();
    }

    // Update score and moves display
    updateStats() {
        this.scoreDisplay.textContent = game.score;
        this.movesDisplay.textContent = game.moves;
    }

    // Save best score to localStorage
    saveBestScore() {
        const currentBest = parseInt(localStorage.getItem('zeviaBestScore') || '0');
        if (game.score > currentBest) {
            localStorage.setItem('zeviaBestScore', game.score);
            this.bestScoreDisplay.textContent = game.score;
        }
    }

    // Load best score from localStorage
    loadBestScore() {
        const bestScore = localStorage.getItem('zeviaBestScore') || '0';
        this.bestScoreDisplay.textContent = bestScore;
    }

    // Check for game end conditions
    checkGameEnd() {
        if (game.won && !game.winModalShown) {
            this.showGameEnd('You Won!', `You reached Ginger Root Beer! Final Score: ${game.score}`);
            game.winModalShown = true;
            this.saveBestScore();
        } else if (game.gameOver) {
            this.showGameEnd('Game Over', `Final Score: ${game.score}`);
            this.saveBestScore();
        }
    }

    // Show game over modal
    showGameEnd(title, message) {
        this.modalTitle.textContent = title;
        this.finalScoreDisplay.textContent = game.score;
        // Apply dim effect to the game board
        this.gameBoard.parentElement.classList.add('dimmed');
        this.gameOverModal.classList.remove('hidden');
    }

    // Hide game over modal
    hideGameEnd() {
        this.gameOverModal.classList.add('hidden');
        // Remove dim effect
        this.gameBoard.parentElement.classList.remove('dimmed');
    }

    // Start new game
    newGame() {
        this.clearAnimationTimers();
        this.isAnimating = false;
        this.pendingDirections = [];
        if (this.animationLockTimer) {
            clearTimeout(this.animationLockTimer);
            this.animationLockTimer = null;
        }
        game.reset();
        this.initializeBoard(); // Reinitialize all tiles
        this.previousBoardState = [];
        this.hideGameEnd();
        this.render();
    }
}

// ==================== Initialize UI ====================
const ui = new UI();
