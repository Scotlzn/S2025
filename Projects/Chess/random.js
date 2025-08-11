import { getRandomIntInRange } from "./support.js";

export default class RandomAI {
    constructor(main) {
        this.main = main;
    }

    move(color) {
        const all_legal_moves = this.main.VMM.getAllValidMoves(color, false, false);
        const all_movable_tiles = Object.keys(all_legal_moves);
        const selected_tile = all_movable_tiles[getRandomIntInRange(0, all_movable_tiles.length - 1)];
        const selected_tile_moves = all_legal_moves[selected_tile];
        console.log(all_legal_moves, all_movable_tiles, selected_tile, selected_tile_moves)
        const selected_move = selected_tile_moves[getRandomIntInRange(0, selected_tile_moves.length - 1)];
        return [selected_tile, selected_move];
    }
}