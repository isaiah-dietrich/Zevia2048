// ==================== Game State ====================
class Game {
    constructor() {
        this.board = [];
        this.score = 0;
        this.moves = 0;
        this.gameOver = false;
        this.won = false;
        this.winModalShown = false; // Track if win modal has been displayed
        this.movedTiles = new Set(); // Track which tiles moved
        this.mergedTiles = new Set(); // Track which tiles merged
        this.newTile = null; // Track newly spawned tile
        this.boardBefore = [];
        this.boardAfterMove = [];
        this.animationMetadata = { moves: [], merges: [] };

        this.flavors = [
            'Cola',
            'Dr. Zevia',
            'Ginger Ale',
            'Black Cherry',
            'Lemon Lime Twist',
            'Orange',
            'Grape',
            'Cream Soda',
            'Cherry Cola',
            'Creamy Root Beer',
            'Ginger Root Beer',
            'Cran-Raspberry',
            'Vanilla Cola',
            'Salted Caramel',
            'Orange Creamsicle'
        ];

        this.initBoard();
    }

    // Initialize 4x4 board
    initBoard() {
        this.board = Array(16).fill(null);
        this.addNewTile();
        this.addNewTile();
    }

    // Add new tile (90% Cola, 10% Ginger Ale)
    addNewTile() {
        const emptyIndices = this.board
            .map((tile, i) => tile === null ? i : -1)
            .filter(i => i !== -1);

        if (emptyIndices.length === 0) return null;

        const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        const isRare = Math.random() < 0.1;
        this.board[randomIndex] = isRare ? 1 : 0; // 0 = Cola, 1 = Ginger Ale
        return randomIndex; // Return index for tracking
    }

    // Get flavor name from index
    getFlavorName(index) {
        return index !== null ? this.flavors[index] : null;
    }

    // Get flavor index from name
    getFlavorIndex(name) {
        return this.flavors.indexOf(name);
    }

    // Move tiles in a direction
    move(direction) {
        if (this.gameOver) return false; // Allow moves after winning

        const boardBefore = this.board.slice();
        this.movedTiles.clear();
        this.mergedTiles.clear();
        this.boardBefore = boardBefore;
        this.boardAfterMove = boardBefore.slice();
        this.animationMetadata = { moves: [], merges: [] };
        this.newTile = null;

        if (direction === 'left') this.moveLeft();
        else if (direction === 'right') this.moveRight();
        else if (direction === 'up') this.moveUp();
        else if (direction === 'down') this.moveDown();
        else return false;

        if (!this.boardsEqual(boardBefore, this.board)) {
            this.boardAfterMove = this.board.slice();
            this.moves++;
            const newTileIndex = this.addNewTile();
            this.newTile = newTileIndex; // Explicitly track new tile
            this.checkGameStatus();
            return true;
        }

        return false;
    }

    boardsEqual(a, b) {
        for (let i = 0; i < 16; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    processLine(indices) {
        const entries = indices
            .map((boardIndex) => ({ value: this.board[boardIndex], from: boardIndex }))
            .filter((entry) => entry.value !== null);

        const result = Array(4).fill(null);
        let read = 0;
        let write = 0;

        while (read < entries.length) {
            const current = entries[read];
            const next = entries[read + 1];
            const target = indices[write];

            if (next && next.value === current.value) {
                const mergedValue = current.value + 1;
                result[write] = mergedValue;
                this.score += Math.pow(2, mergedValue);
                this.mergedTiles.add(target);

                if (current.from !== target) {
                    this.movedTiles.add(target);
                    this.animationMetadata.moves.push({ from: current.from, to: target });
                }

                if (next.from !== target) {
                    this.movedTiles.add(target);
                    this.animationMetadata.moves.push({ from: next.from, to: target });
                }

                this.animationMetadata.merges.push({
                    from: [current.from, next.from],
                    to: target
                });

                read += 2;
            } else {
                result[write] = current.value;
                if (current.from !== target) {
                    this.movedTiles.add(target);
                    this.animationMetadata.moves.push({ from: current.from, to: target });
                }
                read += 1;
            }

            write += 1;
        }

        for (let i = 0; i < 4; i++) {
            this.board[indices[i]] = result[i];
        }
    }

    // Move left
    moveLeft() {
        for (let row = 0; row < 4; row++) {
            this.processLine([
                row * 4,
                row * 4 + 1,
                row * 4 + 2,
                row * 4 + 3
            ]);
        }
    }

    // Move right
    moveRight() {
        for (let row = 0; row < 4; row++) {
            this.processLine([
                row * 4 + 3,
                row * 4 + 2,
                row * 4 + 1,
                row * 4
            ]);
        }
    }

    // Move up
    moveUp() {
        for (let col = 0; col < 4; col++) {
            this.processLine([
                col,
                4 + col,
                8 + col,
                12 + col
            ]);
        }
    }

    // Move down
    moveDown() {
        for (let col = 0; col < 4; col++) {
            this.processLine([
                12 + col,
                8 + col,
                4 + col,
                col
            ]);
        }
    }

    // Check if game is over or won
    checkGameStatus() {
        // Check for Ginger Root Beer (index 10) - 11th can
        if (this.board.includes(10)) {
            this.won = true;
        }

        // Check if no moves available
        if (!this.canMove()) {
            this.gameOver = true;
        }
    }

    // Check if any moves are possible
    canMove() {
        // Check for empty spaces
        if (this.board.includes(null)) return true;

        // Check for possible merges
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const index = i * 4 + j;
                const current = this.board[index];

                // Check right
                if (j < 3 && current === this.board[index + 1]) return true;

                // Check down
                if (i < 3 && current === this.board[index + 4]) return true;
            }
        }

        return false;
    }

    // Reset game
    reset() {
        this.board = [];
        this.score = 0;
        this.moves = 0;
        this.gameOver = false;
        this.won = false;
        this.winModalShown = false; // Reset win modal flag
        this.movedTiles.clear();
        this.mergedTiles.clear();
        this.newTile = null;
        this.boardBefore = [];
        this.boardAfterMove = [];
        this.animationMetadata = { moves: [], merges: [] };
        this.initBoard();
    }

    // Get board state
    getBoardState() {
        return this.board.map(index => index !== null ? this.getFlavorName(index) : null);
    }
}

// ==================== Initialize Game ====================
let game = new Game();
