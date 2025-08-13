var canvas = document.getElementById("canvas1");
var ctx = canvas.getContext('2d');
var step_button = document.getElementById("step_button");
var clear_button = document.getElementById("clear_button");
var play_button = document.getElementById("play_button");
var hunt_button = document.getElementById("hunt_button");
var circle_button = document.getElementById("circle_button");
var complete_button = document.getElementById("complete_button");
var path_button = document.getElementById("path_button");
var grid_button = document.getElementById("grid_button");
var wall_button = document.getElementById("wall_button");

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const GRID_WIDTH = 16;
const GRID_HEIGHT = 16;
const TILE_SIZE = CANVAS_WIDTH / GRID_WIDTH;
const HALF_TILE_SIZE = TILE_SIZE * 0.5;
const DIRECTIONS = [[0, -1], [-1, 0], [1, 0], [0, 1]];

var start_tile = [0, 15];
var current_tile = start_tile;
var grid = [];
var path = [];
var walls = [];

var hunting = false;
var moves_since_last_hunt = 0;
var complete = false;

var instant_hunt = true;
var debug_circles = false;
var show_path = true;
var show_grid = false;
var show_walls = true;

function generate_grid() {
    grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        let new_line = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            new_line.push(0);
        }
        grid.push(new_line);
    }
    // Start tile has been visited
    grid[start_tile[1]][start_tile[0]] = 1;
}

function get_random_int_in_range(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function drawline(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function find_valid_neighbours() {
    let valid_tiles = [];
    DIRECTIONS.forEach((data, index) => {
        // Copying issues here so slice() creates a new separate copy of current_tile
        let tile = current_tile.slice();
        tile[0] += data[0];
        tile[1] += data[1];

        // Out of bounds checks
        if ((tile[0] < 0) || (tile[1] >= GRID_WIDTH)) {
            return;
        }
        if ((tile[1] < 0) || (tile[1] >= GRID_HEIGHT)) {
            return;
        }

        // Check to see if tile has already been visited
        if (grid[tile[1]][tile[0]] != 0) {
            return;
        }

        // Tile is valid -> add to output
        valid_tiles.push([tile[0], tile[1], data]);
    });
    return valid_tiles;
}

function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Render debug circles
    if (debug_circles) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                let tile = grid[y][x];
                if (tile == 0) {
                    continue;
                }
                ctx.beginPath();
                ctx.arc(x * TILE_SIZE + HALF_TILE_SIZE, y * TILE_SIZE + HALF_TILE_SIZE, HALF_TILE_SIZE, 0, Math.PI * 2, true); // Full circle
                ctx.fillStyle = (x == current_tile[0] && y == current_tile[1] && !hunting) ? 'red' : 'blue';
                ctx.fill();
                ctx.closePath();
            }
        }
    }

    // Render grid lines
    if (show_grid) {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                ctx.strokeRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Render hunting outline
    if (hunting) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 4;
        ctx.strokeRect(current_tile[0]*TILE_SIZE, current_tile[1]*TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    // Render path
    if (show_path) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 8;
        path.forEach((data, index) => { // data = [from, to]
            drawline(data[0][0] * TILE_SIZE + HALF_TILE_SIZE, data[0][1] * TILE_SIZE + HALF_TILE_SIZE, data[1][0] * TILE_SIZE + HALF_TILE_SIZE, data[1][1] * TILE_SIZE + HALF_TILE_SIZE);
        });
    }
    
    // Render walls
    if (show_walls) {
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'black';
        walls.forEach((data) => {
            if (data[2]) {
                // Horizontal
                drawline(data[0], data[1], data[0] + TILE_SIZE, data[1]);
            } else {
                // Vertical
                drawline(data[0], data[1], data[0], data[1] + TILE_SIZE);
            }
        }); 
    }
}

function hunt() {
    // Tile has to be visited
    if (grid[current_tile[1]][current_tile[0]] == 1) {
        let valid_neighbours = find_valid_neighbours();
        if (valid_neighbours.length > 0) {
            hunting = false;
            moves_since_last_hunt = 0;
            return;
        }
    }

    // Maze is complete?
    if (current_tile[0] == (GRID_WIDTH-1) && current_tile[1] == (GRID_HEIGHT-1)) {
        hunting = false;
        complete = true;
        pause();
        return;
    }

    // Move
    if (current_tile[0] < (GRID_WIDTH - 1)) {
        current_tile[0]++;
    } else {
        current_tile[0] = 0;
        current_tile[1]++;
    }
}

function wall_checks(tile_data) {
    let horizontal = (current_tile[0] == tile_data[0]) ? true : false; // Horizontal if above/below -> same x
    let direction = tile_data[2]; // valid_neighbours -> [tilex, tiley, [dx, dy]]
    let offset_x = (direction[0] == 1) ? TILE_SIZE : 0; // For vertical walls (when tile is to the right)
    let offset_y = (direction[1] == 1) ? TILE_SIZE : 0; // For horizontal walls (when tile is down)
    return [current_tile[0]*TILE_SIZE + offset_x, current_tile[1]*TILE_SIZE + offset_y, horizontal];
}

function step() {

    if (complete) {
        return;
    }

    if (hunting) {
        hunt();
        return;
    }

    // No possible path -> start hunting, otherwise go in random direction
    let valid_neighbours = find_valid_neighbours();
    if (valid_neighbours.length < 1) {
        hunting = true;
        current_tile = [0, 0]; // Start hunting from top-left of the grid
        if (instant_hunt) {
            while (hunting == true) {
                hunt(); // Hunt until done if instant hunt active
            }
        }
        return;
    }

    let line_data = [];
    let chosen_index = get_random_int_in_range(0, valid_neighbours.length - 1);
    let chosen_neighbour = valid_neighbours[chosen_index];
    line_data.push(current_tile);
    line_data.push(chosen_neighbour);

    // Walls
    if (moves_since_last_hunt > 0) {
        valid_neighbours.forEach((data) => {
            // Chosen tile -> dont want to place a wall there
            if (data[0] == chosen_neighbour[0] && data[1] == chosen_neighbour[1]) {
                return;
            }
            walls.push(wall_checks(data)) // walls data -> [x, y, horizontal?]
        });
    } else {   
        // Find and remove wall thats in the way (after finishing hunting)
        let target = wall_checks(chosen_neighbour);
        const index = walls.findIndex(([a, b, c]) => a === target[0] && b === target[1] && c === target[2]);
        if (index !== -1) walls.splice(index, 1);
    }

    current_tile = chosen_neighbour;
    grid[current_tile[1]][current_tile[0]] = 1;
    path.push(line_data);
    moves_since_last_hunt++;
}

// -- PAGE ONLOAD --
generate_grid();
render();

// --------------- UI -----------------

step_button.onclick = function() {
    step();
    render();
}

function clear() {
    hunting = false;
    complete = false;
    path = []; walls = [];
    current_tile = start_tile;
    generate_grid();
    render();
}

clear_button.onclick = function() {
    clear();
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

hunt_button.onclick = function() {
    instant_hunt = !instant_hunt;
    hunt_button.textContent = (instant_hunt) ? 'Instant hunt ON' : 'Instant hunt OFF';
}

circle_button.onclick = function() {
    debug_circles = !debug_circles;
    circle_button.textContent = (debug_circles) ? 'Debug circles ON' : 'Debug circles OFF';
    render();
}

path_button.onclick = function() {
    show_path = !show_path;
    path_button.textContent = (show_path) ? 'Path ON' : 'Path OFF';
    render();
}

grid_button.onclick = function() {
    show_grid = !show_grid;
    grid_button.textContent = (show_grid) ? 'Grid lines ON' : 'Grid lines OFF';
    render();
}

wall_button.onclick = function() {
    show_walls = !show_walls;
    wall_button.textContent = (show_walls) ? 'Walls ON' : 'Walls OFF';
    render();
}

// Play-Pause stuff
playing = false;
intervalId = 0;

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
    if (complete) return;
    playing = !playing;
    if (playing) {
        play_button.textContent = 'Pause';
        intervalId = setInterval(play, 50);
    } else {
        pause();
    }
}
