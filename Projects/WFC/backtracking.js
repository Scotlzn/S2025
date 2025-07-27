export default class BacktrackingManager {

    BACKTRACKING_MODES = [
    'Backtracking: \nOFF',
    'Backtracking: Linear',
    'Backtracking: Exponential'
    ];

    constructor(main) {
        this.main = main;
        this.active = false;
        this.limit = 32;
        this.max_depth = 1;
        this.current_depth = 0;
        this.mode = 0;
    }

    back() {
        // Cant undo if there is only the starting tile, and stop play or backtracking if active
        if (this.main.tile_history.length < 1) {
            this.main.terminate_backtracking();
            this.main.pause();
            return;
        }

        // new_state format -> [X, Y, [originalOptions, northOptions, eastOptions, southOptions, westOptions]]
        let new_state = this.main.tile_history[this.main.tile_history.length - 1];
        let tile_reverting = this.main.grid[new_state[0]][new_state[1]];

        // Go around adjacent tiles and revert options
        let tile_index = 1;
        this.main.DIRECTIONS.forEach((direction) => {
            let x = new_state[0];
            let y = new_state[1];
            x += direction[0];
            y += direction[1];
            // Check out of bounds
            if (x < 0 || x >= this.main.GRID_SIZE || y < 0 || y >= this.main.GRID_SIZE) {
                return;
            }
            let tile = this.main.grid[x][y];
            // Check if tile is collapsed
            if (tile.collapsed) {
                return;
            }
            tile.options = new_state[2][tile_index];
            tile_index++;
        });

        // Revert options of tile and uncollapse
        tile_reverting.options = new_state[2][0];
        tile_reverting.collapsed = false;
        this.main.complete = false;

        this.main.tile_history.pop();
    }

    change_max_depth() {
        // Hardcoded depth limit so it doesn't basically restart the whole thing
        if (this.max_depth >= this.limit) {
            this.max_depth = this.limit;
            return;
        }
        // Change max depth depending on mode
        if (this.mode == 2) {
            this.max_depth *= 2;
        } else this.max_depth++;
    }

    backtrack() {
        this.back();
        this.current_depth++;
        if (this.current_depth >= this.max_depth) {
            this.terminate();
            this.change_max_depth();
        }
    }

    initiate() {
        // Backtracking off -> Stop
        if (this.mode == 0) {
            this.main.complete = true;
            this.main.pause();
            return;
        } else {
            this.active = true;
            return;
        }
    }

    terminate() {
        this.current_depth = 0;
        this.active = false;
        this.main.error_found = false;
    }
}