import { PIECES, loadFromFEN } from "./support.js";
import Tile from "./tile.js";
import ValidMovesManager from "./valid_moves.js";

const buttons_div = document.getElementById("pawn_promotion_buttons")
const queen_button = document.getElementById("queen_button");
const rook_button = document.getElementById("rook_button");
const bishop_button = document.getElementById("bishop_button");
const knight_button = document.getElementById("knight_button");

class Main {
    constructor() {
        this.canvas = document.getElementById("canvas");
        this.ctx = this.canvas.getContext('2d');

        this.GRID_WIDTH = 8, this.GRID_HEIGHT = 8;
        this.TILE_SIZE = this.canvas.width / this.GRID_WIDTH;
        this.HALF_TILE_SIZE = this.TILE_SIZE * 0.5;
        
        // Prevent sub-pixel values
        this.PERFECT_W = Math.round(this.canvas.width / this.TILE_SIZE) * this.TILE_SIZE;
        this.PERFECT_H = Math.round(this.canvas.height / this.TILE_SIZE) * this.TILE_SIZE;
        this.canvas.width = this.PERFECT_W;
        this.canvas.height = this.PERFECT_H;
        this.BOUNDING_BOX = this.canvas.getBoundingClientRect();

        // -------------- MOUSE EVENTS -----------
        this.mouse = { x: 0, y: 0, tileX: 0, tileY: 0, down: false };
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // -------------------TEXT ---------------
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.font = `bold 40px sans-serif`;
        this.ctx.fillStyle = 'black';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.grid = loadFromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
        this.overlay = new Tile(0, 0);
        this.VMM = new ValidMovesManager(this);
        this.original_tile = [];
        this.promoting_pawn = undefined;
    }

    handleMouseMove(event) {
        this.mouse.x = event.clientX - this.BOUNDING_BOX.left;
        this.mouse.y = event.clientY - this.BOUNDING_BOX.top;
        this.mouse.tileX = Math.floor(this.mouse.x / this.TILE_SIZE);
        this.mouse.tileY = Math.floor(this.mouse.y / this.TILE_SIZE);

        if (this.overlay.piece != 0) {
            this.overlay.x = this.mouse.x;
            this.overlay.y = this.mouse.y;
            this.render();
        }
    }

    handleMouseDown(event) {
        if (this.promoting_pawn != undefined) return;

        this.mouse.down = true;
        let tile = this.grid[this.mouse.tileX][this.mouse.tileY];
        if (tile.piece == 0) return;

        // If overlay is active then dont do anything
        if (this.overlay.piece != 0) return;

        // Set overlay
        this.overlay.x = this.mouse.x;
        this.overlay.y = this.mouse.y;
        this.overlay.piece = tile.piece;
        this.original_tile = [tile.x, tile.y];

        let color = (tile.piece < 7) ? 1 : 2;
        this.overlay.color = color;

        // Remove tile in place
        tile.piece = 0;

        // Find valid moves
        const piece = this.overlay.piece % 6 || 6;
        this.VMM.valid_moves = [];
        this.VMM.validMovesPiece(piece, this.mouse.tileX, this.mouse.tileY, false);

        this.render();
    }

    handleMouseUp(event) {
        if (this.promoting_pawn != undefined) return;

        this.mouse.down = false;

        let tile = this.grid[this.mouse.tileX][this.mouse.tileY]

        // Only place if tile is valid
        const original_tile = this.grid[this.original_tile[0]][this.original_tile[1]];
        const sameTile = this.mouse.tileX == original_tile.x && this.mouse.tileY == original_tile.y;
        if (!this.VMM.valid_moves.includes(tile) && !sameTile) return;

        // Place tile
        tile.piece = this.overlay.piece;
        tile.color = this.overlay.color;

        // ----------- Check and checkmate -----------
        const all_legal_moves = this.VMM.getAllValidTiles(tile.color);
        this.VMM.valid_moves = [];

        // Find opponents king
        const piece_id = (tile.color == 1) ? 12 : 6;
        // [0] Because filter returns an array
        const opponent_king = this.grid.flat().filter(tile => tile.piece == piece_id)[0];
        // Opponents king is a valid move?
        if (all_legal_moves.has(opponent_king)) {
            console.log("Check!")

            // --------- Mate ------------
            this.VMM.validMovesKing(opponent_king.x, opponent_king.y, false);
            // If king has no moves or all the captures it can make are protected
            if (this.VMM.valid_moves.length == 0 || this.VMM.valid_moves.every(item => all_legal_moves.has(item))) {
                console.log("Checkmate!")
            }
            this.VMM.valid_moves = [];
        }

        // ----------- Castling -----------
        // Piece is a king, that hasn't moved and castling is an option
        if ([6, 12].includes(tile.piece) && !original_tile.moved && [1, 6].includes(tile.x)) {
            const y_level = (tile.color == 1) ? 7 : 0;
            const newX = (this.mouse.tileX < 4) ? 2 : 5;
            const rookX = (this.mouse.tileX < 4) ? 0 : 7;
            this.grid[newX][y_level].piece = (tile.color == 1) ? 4 : 10;
            this.grid[rookX][y_level].piece = 0;
        }

        // ----------- En passant ---------
        if (this.VMM.en_passent_tile != undefined) {
            if (this.VMM.en_passent_tile.x == this.mouse.tileX) {
                this.VMM.en_passent_tile.piece = 0;
                this.VMM.en_passent_tile = undefined;
            }
        }

        // ---------- Pawn promotion ---------
        if ([1, 7].includes(tile.piece)) {
            const promotion_file = (tile.color == 1) ? 0 : 7;
            if (this.mouse.tileY == promotion_file) {
                this.promoting_pawn = tile;
                buttons_div.style.display = "block";
            }
        }

        if (!sameTile) {
            original_tile.moved = true;
            tile.moved = true;
        }

        // Remove overlay
        this.overlay.piece = 0;
        this.overlay.castled = false;

        this.render();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render board
        for (let x = 0; x < this.GRID_WIDTH; x++) {
            for (let y = 0; y < this.GRID_HEIGHT; y++) {
                this.ctx.fillStyle = (x + y) % 2 === 0 ? "#ddd" : "#bbb";
                this.ctx.fillRect(x * this.TILE_SIZE, y * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);
                let tile = this.grid[x][y];
                if (this.VMM.valid_moves.includes(tile)) {
                    this.ctx.fillStyle = 'red';
                    this.ctx.fillRect(x * this.TILE_SIZE + this.HALF_TILE_SIZE * 0.5, y * this.TILE_SIZE + this.HALF_TILE_SIZE * 0.5, this.HALF_TILE_SIZE, this.HALF_TILE_SIZE);
                }
                if (tile.piece != 0) {
                    this.ctx.fillStyle = 'black';
                    this.ctx.fillText(PIECES[tile.piece], x * this.TILE_SIZE + this.HALF_TILE_SIZE, y * this.TILE_SIZE + this.HALF_TILE_SIZE);
                }
            }
        }

        // Render overlay
        if (this.overlay.piece != 0) {
            this.ctx.fillStyle = 'black';
            this.ctx.fillText(PIECES[this.overlay.piece], this.overlay.x, this.overlay.y);
        }
    }

    run() {
        this.render();
    }

}

let main = new Main();
main.run();

function promote_pawn(piece) {
    main.promoting_pawn.piece = piece;
    main.promoting_pawn = undefined;
    buttons_div.style.display = "none";
    main.render();
}

queen_button.onclick = () => {
    if (main.promoting_pawn == undefined) return;
    const piece = (main.promoting_pawn.color == 1) ? 5 : 11;
    promote_pawn(piece);
}

rook_button.onclick = () => {
    if (main.promoting_pawn == undefined) return;
    const piece = (main.promoting_pawn.color == 1) ? 4 : 10;
    promote_pawn(piece);
}

bishop_button.onclick = () => {
    if (main.promoting_pawn == undefined) return;
    const piece = (main.promoting_pawn.color == 1) ? 3 : 9;
    promote_pawn(piece);
} 

knight_button.onclick = () => {
    if (main.promoting_pawn == undefined) return;
    const piece = (main.promoting_pawn.color == 1) ? 2 : 8;
    promote_pawn(piece);
}