import { 
    load_assets, get_random_int_in_range, create_array_2D, find_all_possible_options, load_all_data
} from "./support.js";
import BacktrackingManager from "./backtracking.js";
import UIManager from "./ui.js";

class Main {

    constructor(tile_data, image_data) {

        this.canvas = document.getElementById("canvas1");
        this.ctx = this.canvas.getContext('2d');
 
        this.GRID_SIZE = parseInt(document.getElementById("grid_input").value, 10);
        this.IMG_SIZE = tile_data["image_size"]; // In pixels (56)

        // Avoids white lines between tiles 
        let nice_scale = Math.round(800 / this.GRID_SIZE) * this.GRID_SIZE;
        this.canvas.width = nice_scale;
        this.canvas.height = nice_scale;

        this.WIDTH = this.canvas.width;
        this.HEIGHT = this.canvas.height;
        this.TILE_SIZE = this.WIDTH / this.GRID_SIZE;
        this.HALF_TILE_SIZE = this.TILE_SIZE * 0.5;
        this.SCALE = (this.TILE_SIZE / this.IMG_SIZE);
        this.DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

        // ALWAYS READ EVERYTHING CLOCKWISE
        this.SOCKETS = tile_data["sockets"];

        this.ROTATION_OFFSET = tile_data["rotation_offset"]; // The index/tile where rotated images start
        this.TILES = this.SOCKETS.length;
        this.OPTIONS = find_all_possible_options(this.SOCKETS, this.TILES, this.ROTATION_OFFSET);
        this.TOTAL_TILES = this.OPTIONS.length;
        // console.log(this.OPTIONS);

        this.START = [2, 2];

        this.backtracking_manager = new BacktrackingManager(this);
        this.UI_Manager = new UIManager(this);

        this.images = image_data;
        this.grid = create_array_2D(this.GRID_SIZE, this.TOTAL_TILES);
        this.tile_history = [];
        this.complete = false;
        this.error_found = false;
        this.steps = 0;

        this.playing = false;
        this.intervalId = 0;

        this.show_entropy = false;

        this.ctx.imageSmoothingEnabled = false;
        // this.ctx.font = '30px "Press Start 2P"';
        this.ctx.font = '20px "Press Start 2P"';
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
            let new_options = this.OPTIONS[tile_id][index];
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
                        this.ctx.fillText(entropy.toString(), x * this.TILE_SIZE + this.HALF_TILE_SIZE, y * this.TILE_SIZE + this.HALF_TILE_SIZE);
                    }
                }
            }
            this.ctx.restore();  
        }
    }

    step() {
        
        // Fix error where it can get stuck in an endless loop
        this.steps++;
        if (this.steps > (this.GRID_SIZE * this.GRID_SIZE * 4)) {
            this.backtracking_manager.limit += 8;
            this.steps = 0;
            // Completly stuck -> just reset
            if (this.backtracking_manager.limit > 64) this.clear();
            return;
        }

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
        let new_tile = get_random_int_in_range(0, this.TOTAL_TILES - 1);
        let tile = this.grid[this.START[0]][this.START[1]];
        tile.id = new_tile;
        tile.collapsed = true;
        tile.options = [];
        this.update_entropy(this.START[0], this.START[1], tile.id);
    }

    run() {
        // console.log(this.images)
        this.initial_tile();
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
        this.steps = 0;
        this.complete = false;
        this.error_found = false;
        this.backtracking_manager.active = false;
        this.backtracking_manager.max_depth = 2;
        this.backtracking_manager.current_depth = 0;
        this.backtracking_manager.limit = 8;
        this.tile_history = [];
        this.grid = create_array_2D(this.GRID_SIZE, this.TOTAL_TILES);
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
var dataset_button = document.getElementById("dataset_button");
var data = load_all_data();
var image_data = [];
var main;
var dataset = 0;
load_assets(data, run);

function initialise_main() {
    main = new Main(data[dataset], image_data[dataset]);
    main.run();
}

function run(images) {
    image_data = images;
    initialise_main();
}

// ------- Dataset UI stuff ---------
const DATASETS = [
    "Dataset: Circuit",
    "Dataset: Pipes"
]

dataset_button.onclick = () => {
    dataset = (dataset + 1) % DATASETS.length;
    dataset_button.textContent = DATASETS[dataset];
    initialise_main();
    main.render();
}