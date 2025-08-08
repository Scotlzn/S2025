import { DIRECTION8, inBounds, DIRECTION4, DIRECTION4C } from "./support.js";

export default class ValidMovesManager {
    constructor(main) {
        this.main = main;
        this.valid_moves = [];
        this.en_passent_tile = undefined;
    }

    getAllValidMoves(color) {
        // Loop through board
        let legal_moves = {}
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                const tile = this.main.grid[x][y];
                if (tile.piece == 0) continue;
                if (tile.color != color) continue;
                this.valid_moves = [];
                this.validMovesPiece(tile.piece, x, y, false);
                legal_moves[[x, y]] = this.valid_moves;
            }
        }
        return legal_moves;
    }

    getAllValidTiles(color) {
        let legal_moves = new Set();
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                const tile = this.main.grid[x][y];
                if (tile.piece == 0) continue;
                if (tile.color != color) continue;
                this.valid_moves = [];
                const piece = tile.piece % 6 || 6;
                this.validMovesPiece(piece, x, y, true);
                for (const move of this.valid_moves) {
                    legal_moves.add(move);
                }
            }
        }
        return legal_moves;
    }

    validMovesPiece(piece, tileX, tileY, neutral) {
        const PIECE_FUNCTIONS = {
            1: () => this.validMovesPawn(tileX, tileY, neutral),
            2: () => this.validMovesKnight(tileX, tileY, neutral),
            3: () => this.validMovesQRB(DIRECTION4C, tileX, tileY, neutral),
            4: () => this.validMovesQRB(DIRECTION4, tileX, tileY, neutral),
            5: () => this.validMovesQRB(DIRECTION8, tileX, tileY, neutral),
            6: () => this.validMovesKing(tileX, tileY, neutral),
        };
        PIECE_FUNCTIONS[piece]();
    }

    validMovesKing(tileX, tileY, neutral) {
        const original_tile = this.main.grid[tileX][tileY];
        for (const [dx, dy] of DIRECTION8) {
            const x = tileX + dx;
            const y = tileY + dy;
            if (!inBounds(x, y, 8, 8)) continue;
            let tile = this.main.grid[x][y];
            if (tile.piece != 0 && (tile.color == original_tile.color || neutral)) continue;
            this.valid_moves.push(tile);
        }

        // --------- Castling ------------
        // Only activate on mouse down, If queen and rook both have not moved
        if (original_tile.piece == 0 && !original_tile.moved) {
            const castling_y = (original_tile.color == 1) ? 7 : 0;
            const isEmpty = (x) => this.main.grid[x][castling_y].piece == 0;
            // Kingside
            if (!this.main.grid[7][castling_y].moved && isEmpty(5) && isEmpty(6)) {
                this.valid_moves.push(this.main.grid[6][castling_y]);
            }
            // Queenside 
            if (!this.main.grid[0][castling_y].moved && isEmpty(1) && isEmpty(2) && isEmpty(3)) {
                this.valid_moves.push(this.main.grid[1][castling_y]);
            }
        }
    }

    validMovesQRB(directions, tileX, tileY, neutral) {
        const original_tile = this.main.grid[tileX][tileY];

        for (const [dx, dy] of directions) {
            let x = tileX;
            let y = tileY;

            while (true) {
                x += dx;
                y += dy;

                if (!inBounds(x, y, 8, 8)) break;

                const tile = this.main.grid[x][y];

                if (tile.piece !== 0) {
                    if (tile.color !== original_tile.color || neutral) {
                        this.valid_moves.push(tile); // Capture enemy piece
                    }
                    break; // Stop after any piece
                }

                this.valid_moves.push(tile); // Empty square
            }
        }
    }

    validMovesKnight(tileX, tileY, neutral) {
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
                    if (tile.piece != 0 && (tile.color == original_tile.color || neutral)) return;
                    this.valid_moves.push(tile);
                }
            }); 
        });
    }

    validMovesPawn(tileX, tileY, neutral) {
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
                this.valid_moves.push(tile);
            }

            // En passent
            // Check under pawn for opponent pawn, only when mouse down
            if (original_tile.piece == 0) {
                let en_passent_tile = this.main.grid[x][tileY];
                const enemy_pawn = (original_tile.color == 1) ? 7 : 1;
                if (en_passent_tile.piece == enemy_pawn && en_passent_tile.moved) {
                    this.valid_moves.push(tile);
                    this.en_passent_tile = en_passent_tile;
                }
            }
        });
        if (this.valid_moves.length >= 1) return;

        // Check the 1-2 spaces infront
        let y = tileY;
        const direction = (original_tile.color == 1) ? -1 : 1;
        const spaces = ((original_tile.color == 1 && original_tile.y == 6) || (original_tile.color == 2 && original_tile.y == 1)) ? 2 : 1;
        for (let i = 0; i < spaces; i++) {
            y += direction;
            if (!inBounds(tileX, y, 8, 8)) continue;
            let tile = this.main.grid[tileX][y];
            if (tile.piece != 0 && tile.color == original_tile.color) return;
            this.valid_moves.push(tile);
        }
    }
}