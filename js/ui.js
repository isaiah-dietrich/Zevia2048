// ==================== UI Controller ====================
class UI {
    constructor() {
        this.gameBoard = document.getElementById('game-board');
        this.scoreDisplay = document.getElementById('score');
        this.movesDisplay = document.getElementById('moves');
        this.bestScoreDisplay = document.getElementById('best-score');
        this.newGameBtn = document.getElementById('new-game-btn');
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
        this.mergeGhosts = [];
        this.layoutStride = 0;
        this.layoutDirty = true;
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
        const critical = this.flavorImagePaths.slice(0, 3);
        const deferred = this.flavorImagePaths.slice(3);
        const warm = (path) => {
            const img = new Image();
            img.src = path;
            if (typeof img.decode === 'function') {
                img.decode().catch(() => {
                    // Ignore decode failures; browser will still fetch/cache image bytes.
                });
            }
        };

        critical.forEach(warm);

        const preloadDeferred = () => deferred.forEach(warm);
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(preloadDeferred, { timeout: 1200 });
        } else {
            setTimeout(preloadDeferred, 400);
        }
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
        this.newGameBtnModal.addEventListener('click', () => this.newGame());

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        window.addEventListener('resize', () => {
            this.layoutDirty = true;
        });
    }

    // Handle keyboard input
    handleKeyPress(e) {
        if (!this.gameOverModal.classList.contains('hidden')) return;

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
                // Queue a small number of inputs so motion stays continuous.
                const lastQueued = this.pendingDirections[this.pendingDirections.length - 1];
                if (lastQueued !== direction) {
                    this.pendingDirections.push(direction);
                    if (this.pendingDirections.length > 2) {
                        this.pendingDirections = this.pendingDirections.slice(-2);
                    }
                }
                return;
            }
            this.executeMove(direction);
        }
    }

    executeMove(direction) {
        const moved = game.move(direction);
        if (!moved) {
            this.checkGameEnd();
            return false;
        }

        this.isAnimating = true;
        this.render();
        this.startAnimationWatchdog();
        return true;
    }

    startAnimationWatchdog() {
        if (this.animationLockTimer) clearTimeout(this.animationLockTimer);
        this.animationLockTimer = setTimeout(() => {
            if (this.isAnimating) this.cleanupAnimations();
        }, 700);
    }

    interruptAnimations() {
        this.clearAnimationTimers();
        if (this.animationLockTimer) {
            clearTimeout(this.animationLockTimer);
            this.animationLockTimer = null;
        }
        this.clearMergeGhosts();
        this.tiles.forEach((tile) => {
            tile.classList.remove('sliding', 'spawning', 'merging');
        });
        this.syncBoardToState();
        game.newTile = null;
        game.movedTiles.clear();
        game.mergedTiles.clear();
        game.animationMetadata = { moves: [], merges: [] };
        this.isAnimating = false;
    }

    flushPendingDirection() {
        if (this.isAnimating || this.pendingDirections.length === 0) return;

        // Drain buffered inputs until one produces an actual move.
        while (!this.isAnimating && this.pendingDirections.length > 0) {
            const nextDirection = this.pendingDirections.shift();
            const moved = this.executeMove(nextDirection);
            if (moved) return;
        }
    }

    clearAnimationTimers() {
        this.animationTimers.forEach((timer) => clearTimeout(timer));
        this.animationTimers = [];
    }

    clearMergeGhosts() {
        this.mergeGhosts.forEach((ghost) => ghost.remove());
        this.mergeGhosts = [];
    }

    getStride() {
        if (!this.layoutDirty && this.layoutStride > 0) return this.layoutStride;
        const sample = this.tiles.get(0);
        if (!sample) return 110;
        const tileRect = sample.getBoundingClientRect();
        const tileSize = Math.round(tileRect.width);
        const styles = window.getComputedStyle(this.gameBoard);
        const gapStr = styles.getPropertyValue('gap') || styles.getPropertyValue('grid-gap') || '10px';
        const gap = parseInt(gapStr, 10) || 10;
        this.layoutStride = tileSize + gap;
        this.layoutDirty = false;
        return this.layoutStride;
    }

    syncBoardToState() {
        for (let i = 0; i < 16; i++) {
            const tile = this.tiles.get(i);
            if (!tile) continue;

            tile.className = 'tile';
            tile.style.transform = 'translate3d(0, 0, 0)';
            tile.style.opacity = '1';
            tile.dataset.spawnFlavor = '';

            const flavorIndex = game.board[i];
            if (flavorIndex === null || flavorIndex === undefined) {
                tile.classList.add('empty');
                tile.dataset.flavor = '';
                tile.textContent = '';
            } else {
                const flavor = game.getFlavorName(flavorIndex);
                tile.dataset.flavor = flavor;
                tile.textContent = flavor;
            }
        }
    }

    // Render the game board with proper animation sequencing
    render() {
        const SLIDE_MS = 140;
        const CONTACT_HOLD_MS = 10;
        const MERGE_MS = 145;
        const CLEANUP_BUFFER = 32;
        const hasPendingSpawn = game.newTile !== null && game.newTile !== undefined;
        const boardNow = game.board.slice();
        const boardForMotion = hasPendingSpawn && game.boardAfterMove?.length === 16
            ? game.boardAfterMove.slice()
            : boardNow.slice();
        const originFor = new Map();
        const mergePlanByTarget = new Map();

        if (Array.isArray(game.animationMetadata?.merges)) {
            game.animationMetadata.merges.forEach((merge) => {
                const target = merge.to;
                const finalFlavorIndex = boardNow[target];
                if (finalFlavorIndex === null || finalFlavorIndex === undefined) return;

                let preMergeFlavorIndex = game.boardBefore?.[target];
                if (preMergeFlavorIndex === null || preMergeFlavorIndex === undefined) {
                    preMergeFlavorIndex = game.boardBefore?.[merge.from[0]];
                }
                if (preMergeFlavorIndex === null || preMergeFlavorIndex === undefined) {
                    preMergeFlavorIndex = Math.max(0, finalFlavorIndex - 1);
                }

                mergePlanByTarget.set(target, {
                    target,
                    from: Array.isArray(merge.from) ? merge.from.slice() : [],
                    preMergeFlavorIndex,
                    finalFlavorIndex
                });
            });
        }

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
        this.clearMergeGhosts();
        requestAnimationFrame(() => {
            const stride = this.getStride();

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
                    const mergePlan = mergePlanByTarget.get(i);
                    const displayFlavorIndex = mergePlan ? mergePlan.preMergeFlavorIndex : flavorIndex;
                    const flavor = game.getFlavorName(displayFlavorIndex);
                    tile.dataset.flavor = flavor;
                    tile.textContent = flavor;

                    const originIdx = originFor.get(i);
                    if (!mergePlan && originIdx !== undefined && originIdx !== i) {
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

            mergePlanByTarget.forEach((mergePlan, target) => {
                const targetTile = this.tiles.get(target);
                if (!targetTile) return;
                const targetRect = targetTile.getBoundingClientRect();
                const boardRect = this.gameBoard.getBoundingClientRect();
                const movers = mergePlan.from.filter((from) => from !== target);

                movers.forEach((from) => {
                    const sourceFlavorIndex = game.boardBefore?.[from];
                    const flavorIndex = sourceFlavorIndex !== null && sourceFlavorIndex !== undefined
                        ? sourceFlavorIndex
                        : mergePlan.preMergeFlavorIndex;
                    const flavor = game.getFlavorName(flavorIndex);
                    const fromCoord = { row: Math.floor(from / 4), col: from % 4 };
                    const toCoord = { row: Math.floor(target / 4), col: target % 4 };
                    const dx = (fromCoord.col - toCoord.col) * stride;
                    const dy = (fromCoord.row - toCoord.row) * stride;

                    const ghost = document.createElement('div');
                    ghost.className = 'tile tile-ghost';
                    ghost.dataset.flavor = flavor;
                    ghost.style.width = `${Math.round(targetRect.width)}px`;
                    ghost.style.height = `${Math.round(targetRect.height)}px`;
                    ghost.style.left = `${Math.round(targetRect.left - boardRect.left)}px`;
                    ghost.style.top = `${Math.round(targetRect.top - boardRect.top)}px`;
                    ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
                    this.gameBoard.appendChild(ghost);
                    this.mergeGhosts.push(ghost);
                });
            });

            this.gameBoard.offsetHeight;

            // Start all slides at the same time (fixed duration)
            game.movedTiles.forEach((i) => {
                if (mergePlanByTarget.has(i)) return;
                const tile = this.tiles.get(i);
                if (!tile) return;
                tile.classList.add('sliding');
                // Trigger to final position
                tile.style.transform = 'translate3d(0, 0, 0)';
            });
            this.mergeGhosts.forEach((ghost) => {
                ghost.classList.add('sliding');
                ghost.style.transform = 'translate3d(0, 0, 0)';
            });

            // Run follow-up phases only after animations that actually exist.
            const hasSlides = game.movedTiles.size > 0 || this.mergeGhosts.length > 0;
            const hasMerges = game.mergedTiles.size > 0;
            const slideCompleteDelay = hasSlides
                ? (SLIDE_MS + (hasMerges ? CONTACT_HOLD_MS : 0))
                : 0;
            const mergeTimer = setTimeout(() => {
                game.mergedTiles.forEach((i) => {
                    const tile = this.tiles.get(i);
                    if (!tile) return;

                    const mergePlan = mergePlanByTarget.get(i);
                    if (mergePlan) {
                        const mergedFlavor = game.getFlavorName(mergePlan.finalFlavorIndex);
                        tile.classList.remove('empty');
                        tile.dataset.flavor = mergedFlavor;
                        tile.textContent = mergedFlavor;
                    }
                    tile.classList.add('merging');
                });
                this.clearMergeGhosts();
            }, slideCompleteDelay);
            this.animationTimers.push(mergeTimer);

            // Release input lock as soon as movement reaches contact; don't wait
            // for the full visual tail (merge/spawn polish) to finish.
            const unlockDelay = slideCompleteDelay;
            const unlockTimer = setTimeout(() => {
                if (!this.isAnimating) return;
                this.isAnimating = false;
                this.flushPendingDirection();
            }, unlockDelay);
            this.animationTimers.push(unlockTimer);

            // Spawn shortly after impact so controls feel responsive.
            const mergeCompleteDelay = hasMerges ? MERGE_MS : 0;
            const spawnDelay = hasMerges
                ? (slideCompleteDelay + Math.round(MERGE_MS * 0.12))
                : slideCompleteDelay;
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
            const mergeEndDelay = slideCompleteDelay + mergeCompleteDelay;
            const cleanupAfter = Math.max(spawnDelay, mergeEndDelay) + CLEANUP_BUFFER;
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
        this.clearMergeGhosts();

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
        this.checkGameEnd();
        if (this.gameOverModal.classList.contains('hidden')) {
            this.flushPendingDirection();
        } else {
            this.pendingDirections = [];
        }
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
