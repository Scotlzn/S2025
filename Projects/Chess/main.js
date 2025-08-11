import { PIECES } from "./support.js";
import Tile from "./tile.js";
import ValidMovesManager from "./valid_moves.js";
import FENManager from "./fen.js";
import RandomAI from "./random.js";

var promotion_menu = document.getElementById("promotion_menu");
var turn_ui = document.getElementById("turn_ui");
var step_button = document.getElementById("step_button");
var reset_button = document.getElementById("reset_button");
var flip_button = document.getElementById("flip_button");
var import_button = document.getElementById("import_button");
var export_button = document.getElementById("export_button");

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

        this.VMM = new ValidMovesManager(this);
        this.FEN = new FENManager(this);
        this.randomAI = new RandomAI(this);

        this.overlay = new Tile(0, 0);
        this.original_tile = [];
        this.valid_moves = [];
        this.promoting_pawn = undefined;
        this.last_move = undefined;
        this.turn = 1;

        this.loaded_en_passent;
        this.moves = 0; // Total full moves (after black moves)
        this.half_moves_since_last_action = 0; // capture / pawn advance

        this.check = false;
        this.flip_board = false;

        // 0 = Human, 1 = Random
        this.player1 = 0;
        this.player2 = 0;

        this.grid = this.FEN.loadFEN('4n3/4kr1P/1PKpp2P/2p5/2np1b2/3P2pR/8/8 w - - 0 1');
    }

    handleMouseMove(event) {
        this.mouse.x = event.clientX - this.BOUNDING_BOX.left;
        this.mouse.y = event.clientY - this.BOUNDING_BOX.top;
        const tileX = Math.floor(this.mouse.x / this.TILE_SIZE);
        const tileY = Math.floor(this.mouse.y / this.TILE_SIZE);
        this.mouse.tileX = this.flip_board ? this.GRID_WIDTH - 1 - tileX : tileX;
        this.mouse.tileY = this.flip_board ? this.GRID_HEIGHT - 1 - tileY : tileY;

        if (this.overlay.piece != 0) {
            this.overlay.x = this.mouse.x;
            this.overlay.y = this.mouse.y;
            this.render();
        }
    }

    handleMouseDown(event) {
        if (this.player1 != 0 && this.player2 != 0) return;
        if (this.promoting_pawn != undefined) return;

        let tile = this.grid[this.mouse.tileX][this.mouse.tileY];
        if (this.overlay.piece == 0 && tile.piece == 0) return;

        // Check if it's this colours turn
        if (tile.color != this.turn) return;

        this.mouse.down = true;

        // If overlay is active then dont do anything
        if (this.overlay.piece != 0) return;

        // Set overlay
        this.overlay.x = this.mouse.x;
        this.overlay.y = this.mouse.y;
        this.overlay.piece = tile.piece;
        this.overlay.moves = tile.moves;
        this.original_tile = [tile.x, tile.y];

        let color = (tile.piece < 7) ? 1 : 2;
        this.overlay.color = color;

        // Remove tile in place
        tile.piece = 0;
        tile.moves = 0;

        // Find valid moves
        const piece = this.overlay.piece % 6 || 6;
        this.valid_moves = this.VMM.validMovesPiece(piece, this.mouse.tileX, this.mouse.tileY, false, false);

        this.render();
    }

    handleMouseUp(event) {
        if (this.mouse.down == false) return;
        if (this.promoting_pawn != undefined) return;

        this.mouse.down = false;

        let tile = this.grid[this.mouse.tileX][this.mouse.tileY]

        // Only place if tile is valid
        const original_tile = this.grid[this.original_tile[0]][this.original_tile[1]];
        const sameTile = this.mouse.tileX == original_tile.x && this.mouse.tileY == original_tile.y;
        if (!this.valid_moves.includes(tile) && !sameTile) {
            this.reset_piece();
            return;
        }

        let isCapture = (tile.piece != 0);

        // Place tile
        tile.piece = this.overlay.piece;
        tile.color = this.overlay.color;
        tile.moves = this.overlay.moves;

        const isPawn = [1, 7].includes(tile.piece);

        // ----------- Check and checkmate -----------
        this.check = false;
        const all_legal_moves = this.VMM.getAllValidTiles(tile.color, true, true);

        // Find opponents king
        const piece_id = (tile.color == 1) ? 12 : 6;
        // [0] Because filter returns an array
        const opponent_king = this.grid.flat().find(tile => tile.piece == piece_id);
        // Opponents king is a valid move?
        if (all_legal_moves.has(opponent_king)) {
            this.check = true;
            turn_ui.textContent = "Check!";
            // ------------ Mate ------------
            // If all the opponents pieces have no legal moves
            const opponent_color = (tile.color == 1) ? 2 : 1;
            const checkmate = this.VMM.checkmateBlockingCheck(opponent_color);
            if (checkmate) {
                turn_ui.textContent = "Checkmate!";
            }
        }

        // ----------- Castling -----------
        // Piece is a king, that hasn't moved and castling is an option
        if ([6, 12].includes(tile.piece) && (tile.moves == 0) && [1, 6].includes(tile.x)) {
            const y_level = (tile.color == 1) ? 7 : 0;
            const newX = (this.mouse.tileX < 4) ? 2 : 5;
            const rookX = (this.mouse.tileX < 4) ? 0 : 7;
            this.grid[newX][y_level].piece = (tile.color == 1) ? 4 : 10;
            this.grid[rookX][y_level].piece = 0;
        }

        // ----------- En passant ---------
        if (isPawn && this.VMM.en_passant_tile != undefined) {
            const new_tile_direction = (tile.color == 1) ? -1 : 1;
            if (this.VMM.en_passant_tile.x == this.mouse.tileX && (this.VMM.en_passant_tile.y + new_tile_direction) == this.mouse.tileY) {
                this.VMM.en_passant_tile.piece = 0;
                isCapture = true;
            }
        }

        // ---------- Pawn promotion ---------
        if (isPawn) {
            const promotion_file = (tile.color == 1) ? 0 : 7;
            if (this.mouse.tileY == promotion_file) {
                this.promoting_pawn = tile;
                promotion_menu.style.display = "block";
            }
        }

        if (!sameTile) {
            this.last_move = tile;
            tile.moves++;

            this.half_moves_since_last_action++;
            if (isCapture || isPawn) this.half_moves_since_last_action = 0;

            if (this.turn == 2) {
                this.moves++; // Increase total moves
            }

            this.VMM.en_passant_tile = undefined;
            this.switch_turn();
        }

        // Remove overlay
        this.overlay.piece = 0;
        this.overlay.moves = 0;
        this.overlay.castled = false;

        this.valid_moves = [];

        // AI move
        if (this.player1 != 0 || this.player2 != 0) {
            this.step();
        }

        this.render();
    }

    switch_turn() {
        this.turn = (this.turn == 1) ? 2 : 1; 
        if (!this.check) {
            turn_ui.textContent = (this.turn == 1) ? "Turn: White" : "Turn: Black";
        }
    }

    set_turn(t) {
        this.turn = t;
        if (!this.check) {
            turn_ui.textContent = (this.turn == 1) ? "Turn: White" : "Turn: Black";
        }
    }

    reset_piece() {
        // Place piece back in original place
        const original_tile_object = this.grid[this.original_tile[0]][this.original_tile[1]];
        original_tile_object.piece = this.overlay.piece;
        original_tile_object.color = this.overlay.color;

        // Reset overlay and UI
        this.overlay.piece = 0;
        this.overlay.moves = 0;
        this.valid_moves = [];

        this.render();
    }

    step() {
        // Return if its a human's turn
        if (this.player1 == 0 && this.turn == 1) return;
        if (this.player2 == 0 && this.turn == 2) return;

        // Evaluate ai move
        const possible_ai = [
            () => this.randomAI.move(this.turn)
        ]
        const current_player = (this.turn == 1) ? this.player1 : this.player2;
        const ai_move = possible_ai[current_player - 1]();
        const selected_tile_position = ai_move[0].split(","); 
        const selected_tile = this.grid[selected_tile_position[0]][selected_tile_position[1]], selected_move = ai_move[1];
        
        // Place new tile
        selected_move.piece = selected_tile.piece;
        selected_move.color = selected_tile.color;
        selected_move.moves = selected_tile.moves;

        // Remove old tile
        selected_tile.piece = 0;

        this.last_move = selected_move;

        // Increment move count if ai is black
        this.half_moves_since_last_action++;
        if (this.turn == 2) {
            this.moves++;
        }

        this.switch_turn();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render board
        for (let x = 0; x < this.GRID_WIDTH; x++) {
            for (let y = 0; y < this.GRID_HEIGHT; y++) {

                const renderX = this.flip_board ? this.GRID_WIDTH - 1 - x : x;
                const renderY = this.flip_board ? this.GRID_HEIGHT - 1 - y : y;

                this.ctx.fillStyle = (renderX + renderY) % 2 === 0 ? "#ddd" : "#bbb";
                this.ctx.fillRect(renderX * this.TILE_SIZE, renderY * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);

                let tile = this.grid[x][y];
                if (this.valid_moves.includes(tile)) {
                    this.ctx.fillStyle = 'red';
                    this.ctx.fillRect(renderX * this.TILE_SIZE + this.HALF_TILE_SIZE * 0.5, renderY * this.TILE_SIZE + this.HALF_TILE_SIZE * 0.5, this.HALF_TILE_SIZE, this.HALF_TILE_SIZE);
                }
                if (tile.piece != 0) {
                    this.ctx.fillStyle = 'black';
                    this.ctx.fillText(PIECES[tile.piece], renderX * this.TILE_SIZE + this.HALF_TILE_SIZE, renderY * this.TILE_SIZE + this.HALF_TILE_SIZE);
                }
            }
        }

        // Render overlay
        if (this.overlay.piece != 0) {
            this.ctx.fillStyle = 'black';
            this.ctx.fillText(PIECES[this.overlay.piece], this.overlay.x, this.overlay.y);
        }
    }

    reset(FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
        this.BOUNDING_BOX = this.canvas.getBoundingClientRect();
        this.grid = this.FEN.loadFEN(FEN);
        this.overlay = new Tile(0, 0);
        this.original_tile = [];
        this.valid_moves = [];
        this.promoting_pawn = undefined;
        this.VMM.en_passant_tile = undefined;
        this.flip_board = false;

        // If player 1 is AI, the AI plays its first move
        if (this.player1 != 0) {
            this.step();
        }
    }

    run() {
        this.render();
    }

}

let main = new Main();
main.run();

// --------------------------- UI --------------------------

step_button.onclick = () => {
    main.step();
    main.render();
}

reset_button.onclick = () => {
    main.reset();
    main.render();
}

flip_button.onclick = () => {
    main.flip_board = !main.flip_board;
    main.render();
}

import_button.onclick = () => {
    navigator.clipboard.readText()
        .then(text => {
            try {
                main.reset(text);
            } catch (err) {
                // Invalid FEN
                console.log("Invalid FEN!");
                main.reset();
            }
            main.render();
        })
}

export_button.onclick = () => {
    const exported_FEN = main.FEN.createFEN();
    navigator.clipboard.writeText(exported_FEN)
        .then(() => {
            console.log("Copied!");
        })
}

// --------------------- DROPDOWNS -----------------------
const dropdowns = document.querySelectorAll('.dropdown');
const dropbuttons = document.querySelectorAll('.dropbtn');

// Dropdown's visability toggles when clicked
dropbuttons.forEach((button, index) => {
    button.onclick = function() {
        dropdowns[index].classList.toggle('show');
    }
});

// Close the dropdown if the user clicks outside of it
window.addEventListener('click', function(event) {
    dropdowns.forEach((dropdown) => {
        if (!dropdown.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    });
});

// --------------- Players --------------------
const PLAYER_OPTIONS = {
    0: "Human",
    1: "Random AI"
}

// Player 1
const player1 = document.getElementById("player1");
const player1Button = player1.children[0];
const player1Buttons = player1.children[1].children;
for (let button = 0; button < 2; button++) {
    const button_object = player1Buttons[button];
    button_object.onclick = () => {
        main.player1 = button;
        player1Button.textContent = PLAYER_OPTIONS[button];
        dropdowns[0].classList.remove('show');
        main.reset();
        main.render();
    }
}

// Player 2
const player2 = document.getElementById("player2");
const player2Button = player2.children[0];
const player2Buttons = player2.children[1].children;
for (let button = 0; button < 2; button++) {
    const button_object = player2Buttons[button];
    button_object.onclick = () => {
        main.player2 = button;
        player2Button.textContent = PLAYER_OPTIONS[button];
        dropdowns[1].classList.remove('show');
        main.reset();
        main.render();
    }
}

// --------------- Promotions -----------------
function promote_pawn(piece) {
    main.promoting_pawn.piece = piece;
    main.promoting_pawn = undefined;
    promotion_menu.style.display = "none";
    main.render();
}

const PROMOTIONS = {"Queen": 5,"Rook": 4,"Bishop": 3,"Knight": 2}
const promotion_buttons = document.getElementById("promotion_buttons").children;
for (let button = 0; button < 4; button++) {
    const button_object = promotion_buttons[button]
    button_object.onclick = () => {
        if (main.promoting_pawn == undefined) return;
        const colorMultiplier = (main.turn == 2) ? 0 : 1;
        const piece = PROMOTIONS[button_object.textContent] + 6 * colorMultiplier;
        promote_pawn(piece);
        dropdowns[2].classList.remove('show'); // Remove dropdown
    }
}
console.log("Running!")