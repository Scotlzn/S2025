import { PIECES, createArray2D, COORDINATES, isLower, isUpper } from "./support.js";

export default class FENManager {
    constructor(main) {
        this.main = main;
    }

    loadFEN(fen) {
        const FEN_parts = fen.split(" ");
        const board = FEN_parts[0];

        // Setup board
        let grid = createArray2D(8, 8);
        let file = 0, rank = 0;
        board.split('').forEach((char) => {
            if (char == "/") {
                file++;
                rank = 0;
            } else if (Object.values(PIECES).includes(char)) {
                let piece = Object.keys(PIECES).find(key => PIECES[key] === char);
                piece = parseInt(piece); // Convert piece to int from string
                let color = (piece < 7) ? 1 : 2;
                let tile = grid[rank][file];
                
                tile.piece = piece; 
                tile.color = color;

                rank++;
            } else {
                rank += parseInt(char);
            }
        });

        // Who's turn is it?
        const to_move = FEN_parts[1];
        if (to_move == "w") {
            this.main.set_turn(1);
        } else this.main.set_turn(2);

        // Castling
        const avaliable_castling = FEN_parts[2];
        const white_king = grid.flat().find(tile => tile.color == 1 && tile.piece == 6);
        const black_king = grid.flat().find(tile => tile.color == 2 && tile.piece == 12);   
        if (avaliable_castling != "-") {

            const white = isUpper(avaliable_castling[0]);
            const black = isLower(avaliable_castling[avaliable_castling.length - 1]);

            if (!white) white_king.moves++;
            if (!black) black_king.moves++;
            
        } else {
            white_king.moves++;
            black_king.moves++; 
        }

        // En passant
        const en_passant_tile = FEN_parts[3];
        if (en_passant_tile != '-') {
            // Swap turn for en passant
            this.main.switch_turn();

            // Translate c3 -> [2][3] -> this is the new tile of my pawn
            const x = COORDINATES[en_passant_tile[0]];
            const y = 7 - (parseInt(en_passant_tile[1]) - 1);

            // Find tile of opponent pawn
            const opponent_pawn_direction = (this.main.turn == 1) ? 1 : -1;
            const opponent_pawn = grid[x][y + opponent_pawn_direction];
            
            // Allow en passant on the oppenents pawn
            this.main.last_move = opponent_pawn;
        }

        // Half moves since last capture / pawn move (for 50 move rule)
        this.main.half_moves_since_last_action = parseInt(FEN_parts[4]);

        // Total moves since start of the game
        this.main.moves = parseInt(FEN_parts[5]);

        return grid;
    }

    createFEN() {
        let fen = "";

        // ------------- BOARD ---------------
        for (let file = 0; file < 8; file++) {
            let spaces = 0;
            for (let rank = 0; rank < 8; rank++) {
                const tile = this.main.grid[rank][file];
                if (tile.piece == 0) {
                    spaces++;
                } else if (Object.keys(PIECES).includes(tile.piece.toString())) {
                    if (spaces != 0) {
                        fen += spaces;
                        spaces = 0;
                    }
                    fen += PIECES[tile.piece];
                }
            }
            if (spaces != 0) {
                fen += spaces;
            }
            if (file != 7) fen += '/';
        }
        
        // ----------- TURN --------------
        fen += ' ';
        fen += (this.main.turn == 1) ? 'w' : 'b';

        // ---------- CASTLING -----------
        fen += ' ';
        const white = (this.main.grid.flat().find(tile => (tile.color == 1 && tile.piece == 6)).moves == 0);
        const black = (this.main.grid.flat().find(tile => (tile.color == 2 && tile.piece == 12)).moves == 0);
        if (white) fen += 'KQ';
        if (black) fen += 'kq';

        // ---------- EN PASSANT ----------
        fen += ' ';
        const opponent_color = (this.main.turn == 1) ? 2 : 1;
        this.main.mouse.down = true; // Ugly fix ._.
        const opponent_legal_moves = this.main.VMM.findEnPassant(opponent_color);
        this.main.mouse.down = false; // Ugly fix ._.
        if (this.main.VMM.en_passant_tile != undefined) {
            // Find new tile for capture
            const space_direction = (this.main.turn == 1) ? -1 : 1;
            const space_tile = this.main.grid[this.main.VMM.en_passant_tile.x][this.main.VMM.en_passant_tile.y + space_direction];
            const x = Object.keys(COORDINATES).find(k => COORDINATES[k] === space_tile.x);
            const y = 8 - space_tile.y;
            fen += x + y.toString();
        } else fen += '-';

        // Half moves
        fen += ' ';
        fen += this.main.half_moves_since_last_action.toString();

        // Total moves
        fen += ' ';
        fen += this.main.moves.toString();

        return fen
    }
}