import { DIRECTION8, inBounds, DIRECTION4, DIRECTION4C } from "./support.js";

export default class ValidMovesManager {
    constructor(main) {
        this.main = main;
        this.en_passant_tile = undefined;
        this.pieces = {};
    }

    movingIntoCheck(original_tile, new_tile) {
        let king_in_check = false;

        // Save previous states
        const previous_original_tile = { piece: original_tile.piece, color: original_tile.color };
        const previous_new_tile = { piece: new_tile.piece, color: new_tile.color };

        // Perform the move
        new_tile.piece = original_tile.piece;
        new_tile.color = original_tile.color;
        original_tile.piece = 0;
        original_tile.color = 0;

        // Find if my king is now in check (in temp this.main.grid)
        const opponent_color = (new_tile.color == 1) ? 2 : 1; 
        const opponent_legal_moves = this.getAllValidTiles(opponent_color, false, true, true);
        const my_king_id = (new_tile.color == 1) ? 6 : 12;
        const my_king_tile = this.main.grid.flat().find(tile => tile.piece == my_king_id); 
        if (opponent_legal_moves.has(my_king_tile)) {
            king_in_check = true;
        }

        // Restore grid
        new_tile.piece = previous_new_tile.piece;
        new_tile.color = previous_new_tile.color;
        original_tile.piece = previous_original_tile.piece;
        original_tile.color = previous_original_tile.color;

        return king_in_check;
    }

    getAllValidMoves(color, special, neutral, skipCheck) {
        let legal_moves = {};
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                const tile = this.main.grid[x][y];
                if (tile.piece == 0) continue;
                if (tile.color != color) continue;
                const piece = tile.piece % 6 || 6;
                let valid_moves = this.validMovesPiece(piece, x, y, special, neutral, skipCheck);
                let piece_moves = [];
                for (const move of valid_moves) {
                    piece_moves.push(move);
                }
                if (piece_moves.length == 0) continue;
                legal_moves[[x, y]] = piece_moves;
            }
        }
        return legal_moves;
    }

    findEnPassant(color) {
        // Searches through pawns and changes this.en_passant_tile
        const pawn_id = (color == 1) ? 1 : 7;
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                const tile = this.main.grid[x][y];
                if (tile.piece != pawn_id || tile.color != color) continue;
                this.validMovesPawn(x, y, false, false, false);
            }
        }
    }

    getAllValidData(color, special, neutral, skipCheck) {
        let legal_moves = new Set();
        this.pieces = {};
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                const tile = this.main.grid[x][y];
                if (tile.piece == 0) continue;
                if (tile.color != color) continue;
                const piece = tile.piece % 6 || 6;
                if (!(piece in this.pieces)) {
                    this.pieces[piece] = 1;
                } else this.pieces[piece] += 1;
                let valid_moves = this.validMovesPiece(piece, x, y, special, neutral, skipCheck);
                for (const move of valid_moves) {
                    legal_moves.add(move);
                }
            }
        }
        return legal_moves;
    }

    getAllValidTiles(color, special, neutral, skipCheck) {
        let legal_moves = new Set();
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                const tile = this.main.grid[x][y];
                if (tile.piece == 0) continue;
                if (tile.color != color) continue;
                const piece = tile.piece % 6 || 6;
                let valid_moves = this.validMovesPiece(piece, x, y, special, neutral, skipCheck);
                for (const move of valid_moves) {
                    legal_moves.add(move);
                }
            }
        }
        return legal_moves;
    }

    checkmateBlockingCheck(opponent_color) {
        // Finding all the moves to get me out of check
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                const tile = this.main.grid[x][y];
                if (tile.piece == 0) continue;
                if (tile.color != opponent_color) continue;
                const piece = tile.piece % 6 || 6;
                let valid_moves = this.validMovesPiece(piece, x, y, false, false, false);
                if (valid_moves.length != 0) {
                    return false; // There is a move out of check
                }
            }
        }
        return true; // No move out of check -> checkmate
    }

    validMovesPiece(piece, tileX, tileY, special, neutral, skipCheck) {
        const PIECE_FUNCTIONS = {
            1: () => this.validMovesPawn(tileX, tileY, special, neutral, skipCheck),
            2: () => this.validMovesKnight(tileX, tileY, special, neutral, skipCheck),
            3: () => this.validMovesQRB(DIRECTION4C, tileX, tileY, special, neutral, skipCheck),
            4: () => this.validMovesQRB(DIRECTION4, tileX, tileY, special, neutral, skipCheck),
            5: () => this.validMovesQRB(DIRECTION8, tileX, tileY, special, neutral, skipCheck),
            6: () => this.validMovesKing(tileX, tileY, special, neutral, skipCheck),
        };
        const valid_moves = PIECE_FUNCTIONS[piece]();
        return valid_moves;
    }

    validMovesKing(tileX, tileY, special, neutral, skipCheck) {
        let valid_moves = [];
        const original_tile = this.main.grid[tileX][tileY];
        for (const [dx, dy] of DIRECTION8) {
            const x = tileX + dx;
            const y = tileY + dy;
            if (!inBounds(x, y, 8, 8)) continue;
            let tile = this.main.grid[x][y];

            if (tile.piece != 0 && !neutral && tile.color == original_tile.color) continue;
            if (!skipCheck && this.movingIntoCheck(original_tile, tile)) continue;

            valid_moves.push(tile);
        }

        // --------- Castling ------------
        // Only activate on mouse down, If queen and rook both have not moved
        if (special && original_tile.moves == 0) {
            const castling_y = (original_tile.color == 1) ? 7 : 0;
            const isEmpty = (x) => this.main.grid[x][castling_y].piece == 0;
            // Kingside
            if (this.main.grid[7][castling_y].moves == 0 && isEmpty(5) && isEmpty(6)) {
                const tile = this.main.grid[6][castling_y];
                if (skipCheck || !this.movingIntoCheck(original_tile, tile)) {
                    valid_moves.push(tile);
                }
            // Queenside 
            } else if (this.main.grid[0][castling_y].moves == 0 && isEmpty(1) && isEmpty(2) && isEmpty(3)) {
                const tile = this.main.grid[1][castling_y];
                if (skipCheck || !this.movingIntoCheck(original_tile, tile)) {
                    valid_moves.push(tile);
                }
            }
        }

        return valid_moves;
    }

    validMovesQRB(directions, tileX, tileY, special, neutral, skipCheck) {
        let valid_moves = [];
        const original_tile = this.main.grid[tileX][tileY];

        for (const [dx, dy] of directions) {
            let x = tileX;
            let y = tileY;

            while (true) {
                x += dx;
                y += dy;

                if (!inBounds(x, y, 8, 8)) break;

                const tile = this.main.grid[x][y];

                if (tile.piece != 0) {
                    if (tile.color != original_tile.color || neutral) {
                        if (skipCheck || !this.movingIntoCheck(original_tile, tile)) {
                            valid_moves.push(tile); // Capture enemy piece
                        }
                    }
                    break; // Stop after any piece
                }

                if (!skipCheck && this.movingIntoCheck(original_tile, tile)) continue;
                valid_moves.push(tile); // Empty square
            }
        }

        return valid_moves;
    }

    validMovesKnight(tileX, tileY, special, neutral, skipCheck) {
        let valid_moves = [];
        const original_tile = this.main.grid[tileX][tileY];
        DIRECTION4.forEach((direction) => {
            let x = tileX + direction[0] * 2;
            let y = tileY + direction[1] * 2;
            const new_directions = (direction[0] == 0) ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
            new_directions.forEach((new_direction) => {
                const new_x = x + new_direction[0];
                const new_y = y + new_direction[1];
                if (inBounds(new_x, new_y, 8, 8)) {
                    let tile = this.main.grid[new_x][new_y];
                    if (tile.piece != 0 && !neutral && tile.color == original_tile.color) return;
                    if (!skipCheck && this.movingIntoCheck(original_tile, tile)) return;
                    valid_moves.push(tile);
                }
            }); 
        });
        return valid_moves;
    }

    validMovesPawn(tileX, tileY, special, neutral, skipCheck) {
        let valid_moves = [];
        const original_tile = this.main.grid[tileX][tileY];
        
        // Check for captures and return
        const capture_direction = (original_tile.color == 1) ? [[-1, -1], [1, -1]] : [[-1, 1], [1, 1]];
        capture_direction.forEach((dir) => {
            const x = tileX + dir[0];
            const y = tileY + dir[1];
            if (!inBounds(x, y, 8, 8)) return;
            let tile = this.main.grid[x][y];

            // Capture
            if (tile.piece != 0 && (tile.color != original_tile.color || neutral)) {
                if (skipCheck || !this.movingIntoCheck(original_tile, tile)) {
                    valid_moves.push(tile);
                }
            }
            
            // En passent
            // Check under pawn for opponent pawn, only when mouse down
            if (special) {
                let en_passant_tile = this.main.grid[x][tileY];

                const enemy_pawn = (original_tile.color == 1) ? 7 : 1;
                const isEnemyPawn = en_passant_tile.piece == enemy_pawn

                // First move and in past rank 5/2 respectivly
                const firstMove = (en_passant_tile.moves <= 1);
                const pastThreshold = (original_tile.color == 1) ? (tileY < 5) : (tileY > 2);

                // Last move had to have been the enemy pawn
                const lastMove = (this.main.last_move != undefined && this.main.last_move == en_passant_tile);

                if (isEnemyPawn && firstMove && pastThreshold && lastMove) {
                    if (skipCheck || !this.movingIntoCheck(original_tile, tile)) {
                        valid_moves.push(tile);
                        this.en_passant_tile = en_passant_tile;
                    }
                }
            }
        });
        if (valid_moves.length >= 1) return valid_moves;

        // Check the 1-2 spaces infront
        let y = tileY;
        const direction = (original_tile.color == 1) ? -1 : 1;
        const spaces = ((original_tile.color == 1 && original_tile.y == 6) || (original_tile.color == 2 && original_tile.y == 1)) ? 2 : 1;
        for (let i = 0; i < spaces; i++) {
            y += direction;
            if (!inBounds(tileX, y, 8, 8)) continue;
            let tile = this.main.grid[tileX][y];
            if (tile.piece != 0) return valid_moves;
            if (!skipCheck && this.movingIntoCheck(original_tile, tile)) continue;
            valid_moves.push(tile);
        }
        return valid_moves;
    }
}
