import { PIECES, load_assets, REVERSED_COORDINATES, insufficientMaterialCheck } from "./support.js";
import Tile from "./tile.js";
import ValidMovesManager from "./valid_moves.js";
import FENManager from "./fen.js";
import RandomAI from "./random.js";

var promotion_menu = document.getElementById("promotion_menu");
var turn_ui = document.getElementById("turn_ui");
var step_button = document.getElementById("step_button");
var reset_button = document.getElementById("reset_button");
var flip_button = document.getElementById("flip_button");
var back_button = document.getElementById("back_button");
var import_button = document.getElementById("import_button");
var export_button = document.getElementById("export_button");
var image_button = document.getElementById("image_button");
var valid_button = document.getElementById("valid_button");
var play_button = document.getElementById("play_button");
var coord_button = document.getElementById("coord_button");
var endless_button = document.getElementById("simulate_button");

const move_sound = new Audio('./audio/move.mp3');
const capture_sound = new Audio('./audio/capture.mp3');

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

        // --------------- TEXT ---------------
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.font = `bold 40px sans-serif`;
        this.ctx.fillStyle = 'black';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.COORDINATE_OFFSET_X = 15;
        this.COORDINATE_LETTER_X = 17;
        this.COORDINATE_NUMBER_Y = 23;

        // --------------- IMAGE --------------
        this.IMAGE_SCALE = 0.75;
        this.IMAGE_WIDTH = 128 * this.IMAGE_SCALE;
        this.IMAGE_HEIGHT = 128 * this.IMAGE_SCALE;
        this.IMAGE_OFFSETX = (this.TILE_SIZE - this.IMAGE_WIDTH) * 0.5;
        this.IMAGE_OFFSETY = (this.TILE_SIZE - this.IMAGE_HEIGHT) * 0.5;

        this.ctx.imageSmoothingEnabled = true;      
        this.ctx.imageSmoothingQuality = "high";     

        this.VMM = new ValidMovesManager(this);
        this.FEN = new FENManager(this);
        this.randomAI = new RandomAI(this);

        this.overlay = new Tile(0, 0);
        this.original_tile = [];
        this.valid_moves = [];
        this.promoting_pawn = undefined;
        this.last_move = undefined;
        this.turn = 1;

        this.show_images = true;
        this.show_valid_moves = true;
        this.show_coordinates = true;
        this.images = [];
        this.moves = 0; // Total full moves (after black moves)
        this.half_moves_since_last_action = 0; // capture / pawn advance
        this.insufficient_material = [false, false];

        this.check = false;
        this.checkmate = false;
        this.stalemate = false;
        this.flip_board = false;
        this.lost_king = undefined;

        // 0 = Human, 1 = Random
        this.player1 = 0;
        this.player2 = 0;

        this.PLAY_INTERVAL_ID;
        this.playing = false;
        this.endless = false;
        this.prevent_mouse_input = false;
        this.ai_vs_ai = false;
        this.human_vs_human = true;

        // TESTING FEN: 4n3/4kr1P/1PKpp2P/2p5/2np1b2/3P2pR/8/8 w - - 0 1
        this.loaded_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 0';
        this.grid = this.FEN.loadFEN(this.loaded_FEN);
        this.history = [this.loaded_FEN];
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
        if (this.checkmate) return;
        if (this.prevent_mouse_input) return;

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

        // Find valid moves
        const piece = this.overlay.piece % 6 || 6;
        this.valid_moves = this.VMM.validMovesPiece(piece, this.mouse.tileX, this.mouse.tileY, true, false, false);
        
        // Remove tile in place
        tile.piece = 0;
        tile.color = 0;
        tile.moves = 0;

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

        this.place_tile(tile, false, isCapture, sameTile, false);

        // Remove overlay
        this.overlay.piece = 0;
        this.overlay.moves = 0;
        this.overlay.castled = false;

        this.valid_moves = [];

        // AI move -> only if promotion isn't happening
        if (this.promoting_pawn == undefined && !this.checkmate && !this.stalemate) {
            if (this.player1 != 0 || this.player2 != 0) {
                this.step();
            }
        }

        this.render();
    }

    place_tile(tile, AIMove = false, isCapture = false, sameTile = false, promoted = false) {

        // Dont procede if the tile hasn't changed position
        if (sameTile) return;

        const isPawn = [1, 7].includes(tile.piece);

        // -------------- Check, checkmate and stalemate ---------------
        // Does my opponent have any legal moves?
        const opponent_color = (tile.color == 1) ? 2 : 1;
        const opponent_stuck = this.VMM.checkmateBlockingCheck(opponent_color);

        // Find all my legal moves (including my own pieces) -> only looking for opponent's king
        const all_legal_moves = this.VMM.getAllValidData(tile.color, false, true, false);
        const my_pieces = this.VMM.pieces; // For insufficient material
        this.check = false;

        // Find opponent's king
        const piece_id = (tile.color == 1) ? 12 : 6;
        const opponent_king = this.grid.flat().find(tile => tile.piece == piece_id);
        // Opponents king is a legal move? -> In check
        if (all_legal_moves.has(opponent_king)) {
            this.check = true;
            turn_ui.textContent = "Check!";

            // ------------ Mate ------------
            // In check AND all the opponents pieces have no legal moves -> Mate
            if (opponent_stuck) {
                this.lost_king = opponent_king;
                this.checkmate = true;
                turn_ui.textContent = "Checkmate!";
                console.log("Checkmate!")
            }
        
        // ------------ Stalemate -----------
        // Opponent's king NOT in check and opponents pieces have no legal moves -> Stalemate
        } else if (opponent_stuck) {
            this.draw();
            console.log("Stalemate by no avaliable moves!")
        }

        // 50 move rule
        if (this.half_moves_since_last_action > 50) {
            this.draw();
            console.log("Stalemate by the 50 move rule!");
        }

        // Insufficient material
        if (insufficientMaterialCheck(my_pieces)) {
            this.insufficient_material[this.turn - 1] = true;
            if (this.turn == 2 && this.insufficient_material[0] == true) {
                this.draw();
                console.log("Stalemate by insufficient material");
            }
        }

        // Promoted pawns only need to search for check, mate, and stalemate
        if (promoted) { 
            this.history.push(this.FEN.createFEN());
            return;
        }

        // ----------- Castling -----------
        // Piece is a king, that hasn't moved and castling is an option
        if ([6, 12].includes(tile.piece) && (tile.moves == 0) && [1, 6].includes(tile.x)) {
            const y_level = (tile.color == 1) ? 7 : 0;
            const newX = (tile.x < 4) ? 2 : 5;
            const rookX = (tile.x < 4) ? 0 : 7;
            this.grid[newX][y_level].piece = (tile.color == 1) ? 4 : 10;
            this.grid[rookX][y_level].piece = 0;
        }

        // ----------- En passant ---------
        if (isPawn && this.VMM.en_passant_tile != undefined) {
            const new_tile_direction = (tile.color == 1) ? -1 : 1;
            if (this.VMM.en_passant_tile.x == tile.x && (this.VMM.en_passant_tile.y + new_tile_direction) == tile.y) {
                this.VMM.en_passant_tile.piece = 0;
                isCapture = true;
            }
        }

        // ---------- Pawn promotion ---------
        if (isPawn) {
            const promotion_file = (tile.color == 1) ? 0 : 7;
            if (tile.y == promotion_file) {
                this.promoting_pawn = tile;
                if (!AIMove) promotion_menu.style.display = "block";
            }
        }

        tile.moves++;
        this.last_move = tile;

        this.half_moves_since_last_action++;
        if (isCapture || isPawn) this.half_moves_since_last_action = 0;

        // After blacks move
        if (this.turn == 2) {
            this.moves++;
            this.insufficient_material = [false, false]; // Reset as there is
        }

        const playSound = (!this.playing);
        if (isCapture) {
            this.last_move = undefined; // To prevent en passant
            if (playSound) {
                capture_sound.currentTime = 0;
                capture_sound.play();
            }
        } else if (playSound) {
            move_sound.currentTime = 0;
            move_sound.play();
        }

        this.VMM.en_passant_tile = undefined;
        this.switch_turn();

        // Don't add unpromoted pawn to history -> instead this occurs after promotion
        if (this.promoting_pawn != undefined) return;

        this.history.push(this.FEN.createFEN());
    }

    draw() {
        this.stalemate = true;
        turn_ui.textContent = "Stalemate!"
    }

    switch_turn() {
        this.turn = (this.turn == 1) ? 2 : 1; 
        if (!this.check && !this.stalemate) {
            turn_ui.textContent = (this.turn == 1) ? "Turn: White" : "Turn: Black";
        }
    }

    set_turn(t) {
        this.turn = t;
        if (!this.check && !this.stalemate) {
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
        
        const isCapture = (selected_move.piece != 0);

        // Place new tile
        selected_move.piece = selected_tile.piece;
        selected_move.color = selected_tile.color;
        selected_move.moves = selected_tile.moves;

        // Remove old tile
        selected_tile.piece = 0;

        this.place_tile(selected_move, true, isCapture, false, false);

        // Handle promotions
        if (this.promoting_pawn != undefined) {
            const colorMultiplier = (this.turn == 2) ? 0 : 1;
            // AI always promotes to queen (id=5) - subject to change
            const piece = (5) + 6 * colorMultiplier;
            this.promoting_pawn.piece = piece;
            this.place_tile(this.promoting_pawn, true, false, false, true);
            this.promoting_pawn = undefined;
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render board
        this.ctx.save();
        this.ctx.scale(1, 1);
        for (let x = 0; x < this.GRID_WIDTH; x++) {
            for (let y = 0; y < this.GRID_HEIGHT; y++) {

                const renderX = this.flip_board ? this.GRID_WIDTH - 1 - x : x;
                const renderY = this.flip_board ? this.GRID_HEIGHT - 1 - y : y;

                // Background
                this.ctx.fillStyle = (renderX + renderY) % 2 === 0 ? "#ddd" : "#bbb";
                this.ctx.fillRect(renderX * this.TILE_SIZE, renderY * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);

                // Checkmate UI
                if (this.checkmate) {
                    if (renderX == this.lost_king.x && renderY == this.lost_king.y) {
                        this.ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
                        this.ctx.fillRect(renderX * this.TILE_SIZE, renderY * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);
                    }
                }

                // Coordinate labels
                if (this.show_coordinates) {
                    this.ctx.font = `bold 30px sans-serif`;
                    this.ctx.fillStyle = (renderX + renderY) % 2 === 0 ? "#bbb" : "#ddd";
                    // a-h
                    if (renderY == 7) {
                        this.ctx.fillText(REVERSED_COORDINATES[renderX].toString(), renderX * this.TILE_SIZE + this.TILE_SIZE - this.COORDINATE_OFFSET_X, renderY * this.TILE_SIZE + this.TILE_SIZE - this.COORDINATE_LETTER_X);
                    }
                    // 1-8
                    if (renderX == 0) {
                        this.ctx.fillText((8 - renderY).toString(), renderX * this.TILE_SIZE + this.COORDINATE_OFFSET_X, renderY * this.TILE_SIZE + this.COORDINATE_NUMBER_Y);
                    }
                }

                // Valid tiles
                let tile = this.grid[x][y];
                if (this.show_valid_moves && this.valid_moves.includes(tile)) {
                    this.ctx.fillStyle = 'red';
                    this.ctx.fillRect(renderX * this.TILE_SIZE + this.HALF_TILE_SIZE * 0.5, renderY * this.TILE_SIZE + this.HALF_TILE_SIZE * 0.5, this.HALF_TILE_SIZE, this.HALF_TILE_SIZE);
                }

                // Text pieces
                if (!this.show_images && tile.piece != 0) {
                    this.ctx.font = `bold 40px sans-serif`;
                    this.ctx.fillStyle = 'black';
                    this.ctx.fillText(PIECES[tile.piece], renderX * this.TILE_SIZE + this.HALF_TILE_SIZE, renderY * this.TILE_SIZE + this.HALF_TILE_SIZE);
                }
            }
        }
        this.ctx.restore();

        // Render image pieces
        if (this.show_images) {
            this.ctx.save();
            for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 8; y++) {
                    const renderX = this.flip_board ? this.GRID_WIDTH - 1 - x : x;
                    const renderY = this.flip_board ? this.GRID_HEIGHT - 1 - y : y;
                    let tile = this.grid[x][y];
                    if (tile.piece != 0) {
                        const img = this.images[tile.piece - 1];
                        this.ctx.drawImage(img, renderX * this.TILE_SIZE + this.IMAGE_OFFSETX, renderY * this.TILE_SIZE + this.IMAGE_OFFSETY, this.IMAGE_WIDTH, this.IMAGE_HEIGHT);
                    }   
                }
            }
            this.ctx.restore();
        }

        // Render overlay
        if (this.overlay.piece != 0) {
            this.ctx.save();
            if (this.show_images) {
                this.ctx.drawImage(this.images[this.overlay.piece - 1], this.overlay.x - this.IMAGE_WIDTH * 0.5, this.overlay.y - this.IMAGE_HEIGHT * 0.5, this.IMAGE_WIDTH, this.IMAGE_HEIGHT);
            } else {
                this.ctx.fillStyle = 'black';
                this.ctx.fillText(PIECES[this.overlay.piece], this.overlay.x, this.overlay.y);
            }
            this.ctx.restore();
        }
    }

    reset(fullReset = false, FEN = this.loaded_FEN) {
        this.BOUNDING_BOX = this.canvas.getBoundingClientRect();

        this.check = false;
        this.checkmate = false;
        this.stalemate = false;

        this.grid = this.FEN.loadFEN(FEN);
        this.overlay = new Tile(0, 0);
        this.original_tile = [];
        this.valid_moves = [];
        this.VMM.en_passant_tile = undefined;
        this.flip_board = false;
        this.prevent_mouse_input = false;

        this.promoting_pawn = undefined;
        promotion_menu.style.display = "none";

        this.ai_vs_ai = false;
        this.human_vs_human = false;
        if (this.player1 == 0 && this.player2 == 0) this.human_vs_human = true;
        if (this.player1 != 0 && this.player2 != 0) this.ai_vs_ai = true;

        if (fullReset) {
            this.history = [FEN];
            this.pause();
            if (this.player1 != 0 && !this.ai_vs_ai) {
                this.step();
            }
        }
    }

    play() {
        if (this.checkmate || this.stalemate) {
            if (this.endless && this.ai_vs_ai) {
                this.reset(false);
                this.history = [this.loaded_FEN];
            } else this.pause();
            return;
        }
        this.step();
        this.render();
    }

    pause() {
        play_button.textContent = 'Play';
        this.playing = false;
        clearInterval(this.PLAY_INTERVAL_ID);
    }

    run(image_data) {
        this.images = image_data;
        this.render();
    }

}

let main = new Main();
load_assets(main.run.bind(main));

// --------------------------- UI --------------------------

step_button.onclick = () => {
    if (main.checkmate || main.stalemate) return;
    main.prevent_mouse_input = false;
    main.step();
    main.render();
}

reset_button.onclick = () => {
    main.reset(true);
    main.render();
}

flip_button.onclick = () => {
    main.flip_board = !main.flip_board;
    main.render();
}

image_button.onclick = () => {
    main.show_images = !main.show_images;
    main.render();
}

valid_button.onclick = () => {
    main.show_valid_moves = !main.show_valid_moves;
    main.render();
}

coord_button.onclick = () => {
    main.show_coordinates = !main.show_coordinates;
    main.render();
}

endless_button.onclick = () => {
    main.endless = !main.endless;
    endless_button.textContent = (main.endless) ? "Endless: ON" : "Endless: OFF";
}

back_button.onclick = () => {
    if (main.history.length > 1) {
        const penultimate_state = main.history[main.history.length - 2];
        main.history.pop();
        main.reset(false, penultimate_state);

        // AI move? -> Disable mouse controls and force step to be pressed
        const AIMove = ((main.player1 != 0 && main.turn == 1) || (main.player2 != 0 && main.turn == 2));
        if (AIMove) main.prevent_mouse_input = true;

        main.mouse.down = false; // Prevent bug as the overlay is removed

        main.render();
    }
}

play_button.onclick = () => {
    if (main.player1 == 0 || main.player2 == 0) return;
    if (main.checkmate || main.stalemate) return;
    main.playing = !main.playing;
    if (main.playing) {
        play_button.textContent = 'Pause';
        main.PLAY_INTERVAL_ID = setInterval(() => {
            main.play(); 
        }, 20);
    } else {
        main.pause();
    }
}

import_button.onclick = () => { // New JS :O
    navigator.clipboard.readText()
        .then(text => {
            try {
                main.reset(true, text);
                import_button.textContent = 'Pasted!'
                setTimeout(() => { import_button.textContent = 'Import FEN'; }, 3000);
            } catch (err) {
                import_button.textContent = 'Invalid!'
                setTimeout(() => { import_button.textContent = 'Import FEN'; }, 3000);
                main.reset(true);
            }
            main.render();
        })
}

export_button.onclick = () => {
    navigator.clipboard.writeText(main.history[main.history.length - 1])
        .then(() => {
            export_button.textContent = 'Copied!'
            setTimeout(() => {
                export_button.textContent = 'Export FEN';
            }, 3000);
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
        main.reset(true);
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
        main.reset(true);
        main.render();
    }
}

// --------------- Promotions -----------------
function promote_pawn(piece) {
    main.promoting_pawn.piece = piece;
    main.place_tile(main.promoting_pawn, false, false, false, true);
    main.promoting_pawn = undefined;
    promotion_menu.style.display = "none";
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
        
        const aiActive = (main.player1 != 0 || main.player2 != 0);
        if (aiActive && !main.checkmate && !main.stalemate) main.step();

        main.render();
    }
}
console.log("Running!")