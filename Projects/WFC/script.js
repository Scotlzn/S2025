import { load_assets, get_random_int_in_range, create_array_2D } from "./support.js";

var canvas = document.getElementById("canvas1");
var ctx = canvas.getContext('2d');
var play_button = document.getElementById("play_button");
var step_button = document.getElementById("step_button");
var clear_button = document.getElementById("clear_button");
var complete_button = document.getElementById("complete_button");
var entropy_button = document.getElementById("entropy_button");
var back_button = document.getElementById("back_button");
var backtracking_button = document.getElementById("backtracking_button");

const GRID_SIZE = 30;
const IMG_SIZE = 3; // In pixels

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const TILE_SIZE = WIDTH / GRID_SIZE;
const HALF_TILE_SIZE = TILE_SIZE * 0.5;
const SCALE = TILE_SIZE / IMG_SIZE;
const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Up, right, down, left
const OPTIONS = [
    [[1, 0], [2, 0], [3, 0], [4, 0]], // TILE 0
    [[2, 3, 4], [1, 3, 4], [3, 0], [1, 2, 3]], // TILE 1
    [[2, 3, 4], [1, 3, 4], [1, 2, 4], [4, 0]], // TILE 2
    [[1, 0], [1, 3, 4], [1, 2, 4], [1, 2, 3]], // TILE 3
    [[2, 3, 4], [2, 0], [1, 2, 4], [1, 2, 3]] // TILE 4
];
const TILES = OPTIONS.length;
const START = [2, 2];

var images = [];
var grid = create_array_2D(GRID_SIZE, TILES);
var tile_history = [];
var complete = false;
var error_found = false;

var backtracking = false;
var max_backtracking_depth = 1;
var current_backtracking_depth = 0;
var backtracking_mode = 0;

var show_entropy = false;

ctx.imageSmoothingEnabled = false;
// ctx.font = '40px "Press Start 2P"';
ctx.font = '30px "Press Start 2P"';
ctx.fillStyle = 'black';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

function update_options(options, new_options) {
    // Using sets, returns a list of the common elements between these 2 lists
    const set = new Set(new_options);
    return options.filter(item => set.has(item));
}

function update_entropy(x, y, tile_id) {
    let options_data = OPTIONS[tile_id];
    let neighbour_options = [];
    DIRECTIONS.forEach((direction, index) => {
        let position = [x,  y];
        position[0] += direction[0];
        position[1] += direction[1];

        // Check out of bounds
        if (position[0] < 0 || position[0] >= GRID_SIZE || position[1] < 0 || position[1] >= GRID_SIZE) {
            return;
        }

        let tile = grid[position[0]][position[1]];

        // Check if tile is collapsed
        if (tile.collapsed) {
            return;
        }

        // Remove options that are not in new options
        neighbour_options.push(tile.options);
        let new_options = options_data[index];
        let updated_options = update_options(tile.options, new_options);
        tile.options = updated_options;

        // Detect entropy = 0, uncollapsed
        if (updated_options.length < 1) {
            error_found = true;
        }
    });
    return neighbour_options;
}

function back() {
    // Cant undo if there is only the starting tile, and stop play or backtracking if active
    if (tile_history.length < 1) {
        terminate_backtracking();
        pause();
        return;
    }

    // new_state format -> [X, Y, [originalOptions, northOptions, eastOptions, southOptions, westOptions]]
    let new_state = tile_history[tile_history.length - 1];
    let tile_reverting = grid[new_state[0]][new_state[1]];

    // Go around adjacent tiles and revert options
    let tile_index = 1;
    DIRECTIONS.forEach((direction) => {
        let x = new_state[0];
        let y = new_state[1];
        x += direction[0];
        y += direction[1];
        // Check out of bounds
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
            return;
        }
        let tile = grid[x][y];
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
    complete = false;

    tile_history.pop();
}

function backtrack() {
    back();
    current_backtracking_depth++;
    if (current_backtracking_depth >= max_backtracking_depth) {
        terminate_backtracking();
        if (backtracking_mode == 2) {
            max_backtracking_depth *= 2;
        } else max_backtracking_depth++;
    }
}

function terminate_backtracking() {
    current_backtracking_depth = 0;
    backtracking = false;
    error_found = false;
}

function initiate_backtracking() {
    // Backtracking off -> Stop
    if (backtracking_mode == 0) {
        complete = true;
        pause();
        return;
    } else {
        backtracking = true;
        return;
    }
}

function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Render tiles
    ctx.save();
    ctx.scale(SCALE, SCALE);
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            let tile = grid[x][y];
            if (tile.collapsed) { 
                ctx.drawImage(images[tile.id], x * IMG_SIZE, y * IMG_SIZE);
            }
        }
    }
    ctx.restore();

    // Render text
    if (show_entropy) {
        ctx.save();
        ctx.scale(1, 1);
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                let tile = grid[x][y];
                ctx.fillText(tile.options.length.toString(), x * TILE_SIZE + HALF_TILE_SIZE, y * TILE_SIZE + HALF_TILE_SIZE);
            }
        }
        ctx.restore();  
    }
}

function step() {
    // If backtracking is active, step backtracks
    if (backtracking) {
        backtrack();
        return;
    }
    if (complete) return;

    // ------- Finding the tile(s) with the least entropy --------
    // Flatten the 2D array into a 1D array
    let flat_grid = grid.flat();
    // Filter out only uncollapsed tiles
    let uncollapsed = flat_grid.filter(tile => !tile.collapsed);
    // WFC is complete?
    if (uncollapsed.length === 0) {
        complete = true;
        pause();
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
    let neighbour_options = update_entropy(selected_tile.position[0], selected_tile.position[1], selected_tile.id);
    tile_history.push([selected_tile.position[0], selected_tile.position[1], [original_options, ...neighbour_options]]);

    // Start backtracking or stop program when it finds an error (entropy = 0, uncollapsed)
    if (error_found) {
        initiate_backtracking();
    }
}

function initial_tile() {
    let new_tile = get_random_int_in_range(0, TILES - 1);
    let tile = grid[START[0]][START[1]];
    tile.id = new_tile;
    tile.collapsed = true;
    tile.options = [];
    update_entropy(START[0], START[1], tile.id);
}

function run(image_data) {
    images = image_data;
    initial_tile();
    render();
}

function clear() {
    complete = false;
    error_found = false;
    backtracking = false;
    max_backtracking_depth = 1;
    current_backtracking_depth = 0;
    tile_history = [];
    grid = create_array_2D(GRID_SIZE, TILES);
    initial_tile();
}

// ----------------- UI ------------------
step_button.onclick = function() {
    step();
    render();
}

clear_button.onclick = function() {
    clear();
    render();
}

back_button.onclick = function() {
    if (backtracking) return;
    back();
    render();
}

complete_button.onclick = function() {
    if (complete) {
        clear();
    }
    while (!complete) {
        step();
    }
    render();
}

entropy_button.onclick = function() {
    show_entropy = !show_entropy;
    entropy_button.textContent = (show_entropy) ? 'Show entropy: \nON' : 'Show entropy: \nOFF';
    render();
}

// ---------- Backtracking UI ---------

const backtracking_modes = [
    'Backtracking: \nOFF',
    'Backtracking: Linear',
    'Backtracking: Exponential'
];

backtracking_button.onclick = function() {
    backtracking_mode = (backtracking_mode + 1) % backtracking_modes.length;
    backtracking_button.textContent = backtracking_modes[backtracking_mode];
    if (error_found && backtracking_mode != 0) backtracking = true;
}

// ---------- Play/Pause ---------
var playing = false;
var intervalId = 0;

function play() {
    step();
    render();
}

function pause() {
    play_button.textContent = 'Play';
    playing = false;
    clearInterval(intervalId);
}

play_button.onclick = function() {
    if (complete && !backtracking) return;
    playing = !playing;
    if (playing) {
        play_button.textContent = 'Pause';
        intervalId = setInterval(play, 50);
    } else pause();
}

// ------- Page ONLOAD --------
load_assets(run);