import { load_assets, get_random_int_in_range, create_array_2D } from "./support.js";
import BacktrackingManager from "./backtracking.js";
import UIManager from "./ui.js";

class Main {

    constructor() {

        this.canvas = document.getElementById("canvas1");
        this.ctx = this.canvas.getContext('2d');

        this.GRID_SIZE = 30;
        this.IMG_SIZE = 3; // In pixels

        this.WIDTH = this.canvas.width;
        this.HEIGHT = this.canvas.height;
        this.TILE_SIZE = this.WIDTH / this.GRID_SIZE;
        this.HALF_TILE_SIZE = this.TILE_SIZE * 0.5;
        this.SCALE = this.TILE_SIZE / this.IMG_SIZE;
        this.DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

        // Up, right, down, left
        this.OPTIONS = [
            [[1, 0], [2, 0], [3, 0], [4, 0]], // TILE 0
            [[2, 3, 4], [1, 3, 4], [3, 0], [1, 2, 3]], // TILE 1
            [[2, 3, 4], [1, 3, 4], [1, 2, 4], [4, 0]], // TILE 2
            [[1, 0], [1, 3, 4], [1, 2, 4], [1, 2, 3]], // TILE 3
            [[2, 3, 4], [2, 0], [1, 2, 4], [1, 2, 3]] // TILE 4
        ];
        this.TILES = this.OPTIONS.length;
        this.START = [2, 2];

        this.backtracking_manager = new BacktrackingManager(this);
        this.UI_Manager = new UIManager(this);

        this.images = [];
        this.grid = create_array_2D(this.GRID_SIZE, this.TILES);
        this.tile_history = [];
        this.complete = false;
        this.error_found = false;

        this.playing = false;
        this.intervalId = 0;

        this.show_entropy = false;

        this.ctx.imageSmoothingEnabled = false;
        // this.ctx.font = '40px "Press Start 2P"';
        this.ctx.font = '30px "Press Start 2P"';
        this.ctx.fillStyle = 'black';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
    }

    update_options(options, new_options) {
        // Using sets, returns a list of the common elements between these 2 lists
        const set = new Set(new_options);
        return options.filter(item => set.has(item));
    }

    update_entropy(x, y, tile_id) {
        let options_data = this.OPTIONS[tile_id];
        let neighbour_options = [];
        this.DIRECTIONS.forEach((direction, index) => {
            let position = [x,  y];
            position[0] += direction[0];
            position[1] += direction[1];

            // Check out of bounds
            if (position[0] < 0 || position[0] >= this.GRID_SIZE || position[1] < 0 || position[1] >= this.GRID_SIZE) {
                return;
            }

            let tile = this.grid[position[0]][position[1]];

            // Check if tile is collapsed
            if (tile.collapsed) {
                return;
            }

            // Remove options that are not in new options
            neighbour_options.push(tile.options);
            let new_options = options_data[index];
            let updated_options = this.update_options(tile.options, new_options);
            tile.options = updated_options;

            // Detect entropy = 0, uncollapsed
            if (updated_options.length < 1) {
                this.error_found = true;
            }
        });
        return neighbour_options;
    }

    render() {
        this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

        // Render tiles
        this.ctx.save();
        this.ctx.scale(this.SCALE, this.SCALE);
        for (let x = 0; x < this.GRID_SIZE; x++) {
            for (let y = 0; y < this.GRID_SIZE; y++) {
                let tile = this.grid[x][y];
                if (tile.collapsed) { 
                    this.ctx.drawImage(this.images[tile.id], x * this.IMG_SIZE, y * this.IMG_SIZE);
                }
            }
        }
        this.ctx.restore();

        // Render text
        if (this.show_entropy) {
            this.ctx.save();
            this.ctx.scale(1, 1);
            for (let x = 0; x < this.GRID_SIZE; x++) {
                for (let y = 0; y < this.GRID_SIZE; y++) {
                    let tile = this.grid[x][y];
                    let entropy = tile.options.length;
                    if (entropy > 0) {
                        this.ctx.fillText(tile.options.toString(), x * this.TILE_SIZE + this.HALF_TILE_SIZE, y * this.TILE_SIZE + this.HALF_TILE_SIZE);
                    }
                }
            }
            this.ctx.restore();  
        }
    }

    step() {
        // If backtracking is active, step backtracks
        if (this.backtracking_manager.active) {
            this.backtracking_manager.backtrack();
            return;
        }
        if (this.complete) return;

        // ------- Finding the tile(s) with the least entropy --------
        // Flatten the 2D array into a 1D array
        let flat_grid = this.grid.flat();
        // Filter out only uncollapsed tiles
        let uncollapsed = flat_grid.filter(tile => !tile.collapsed);
        // WFC is complete?
        if (uncollapsed.length === 0) {
            this.complete = true;
            this.pause();
            return;
        }
        // Map creates an array of entropies, ... changes list into arguments
        let minimum_entropy = Math.min(...uncollapsed.map(tile => tile.options.length));
        // Get list of tiles with the minimum entropy
        let selected_tiles = uncollapsed.filter(tile => tile.options.length === minimum_entropy);
        let selected_index = get_random_int_in_range(0, selected_tiles.length - 1);
        let selected_tile = selected_tiles[selected_index];

        // Now that tile has been found, choose tile randomly based on options
        let chosen_id_index = get_random_int_in_range(0, selected_tile.options.length - 1);
        let chosen_id = selected_tile.options[chosen_id_index];

        // Record original options for tile history
        let original_options = selected_tile.options;

        // Place tile as well as update entropy and tile history accordingly
        selected_tile.collapsed = true;
        selected_tile.id = chosen_id;
        selected_tile.options = [];
        let neighbour_options = this.update_entropy(selected_tile.position[0], selected_tile.position[1], selected_tile.id);
        this.tile_history.push([selected_tile.position[0], selected_tile.position[1], [original_options, ...neighbour_options]]);

        // Start backtracking or stop program when it finds an error (entropy = 0, uncollapsed)
        if (this.error_found) {
            this.backtracking_manager.initiate();
        }
    }

    initial_tile() {
        let new_tile = get_random_int_in_range(0, this.TILES - 1);
        let tile = this.grid[this.START[0]][this.START[1]];
        tile.id = new_tile;
        tile.collapsed = true;
        tile.options = [];
        this.update_entropy(this.START[0], this.START[1], tile.id);
    }

    run(image_data) {
        this.images = image_data;
        this.initial_tile();
        this.complete_grid();
        this.render();
    }

    complete_grid() {
        if (this.complete) {
            this.clear();
        }
        while (!this.complete) {
            this.step();
        }
        this.render();
    }

    clear() {
        this.complete = false;
        this.error_found = false;
        this.backtracking_manager.active = false;
        this.backtracking_manager.max_depth = 1;
        this.backtracking_manager.current_depth = 0;
        this.tile_history = [];
        this.grid = create_array_2D(this.GRID_SIZE, this.TILES);
        this.initial_tile();
    }

    play() {
        this.step();
        this.render();
    }

    pause() {
        this.UI_Manager.play_button.textContent = 'Play';
        this.playing = false;
        clearInterval(this.intervalId);
    }
}

// ------- Page ONLOAD --------
var main = new Main();
load_assets(main);