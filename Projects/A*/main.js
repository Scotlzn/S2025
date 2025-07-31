import { createArray2D, DIRECTION8, getRandomIntInRange, inBounds } from "./support.js";

var play_button = document.getElementById("play_button");
var step_button = document.getElementById("step_button");
var restart_button = document.getElementById("restart_button");
var complete_button = document.getElementById("complete_button");
var path_button = document.getElementById("path_button");
var set_button = document.getElementById("set_button");
var cost_button = document.getElementById("cost_button");

class Main {
    constructor() {
        this.canvas = document.getElementById("canvas");
        this.ctx = this.canvas.getContext('2d');
 
        this.GRID_WIDTH = 20, this.GRID_HEIGHT = 20;
        this.TILE_SIZE = this.canvas.width / this.GRID_WIDTH;
        this.HALF_TILE_SIZE = this.TILE_SIZE * 0.5;
        
        // Prevent sub-pixel values
        this.PERFECT_W = Math.round(this.canvas.width / this.TILE_SIZE) * this.TILE_SIZE;
        this.PERFECT_H = Math.round(this.canvas.height / this.TILE_SIZE) * this.TILE_SIZE;
        this.canvas.width = this.PERFECT_W;
        this.canvas.height = this.PERFECT_H;
        this.BOUNDING_BOX = this.canvas.getBoundingClientRect();
        this.update = this.update.bind(this);

        // -------------- MOUSE EVENTS -----------
        this.mouse = { x: 0, y: 0, tileX: 0, tileY: 0, down: false };
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // ---------------- TEXT ---------------
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.fillStyle = 'black';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.START = [0, 0];
        this.END = [this.GRID_WIDTH - 1, this.GRID_HEIGHT - 1];

        this.show_path = true;
        this.show_set = true;
        this.show_cost = true;

        this.grid = createArray2D(this.GRID_WIDTH, this.GRID_HEIGHT);
        this.open = new Set(); // Nodes to be evaluated
        this.closed = new Set(); // Nodes already evaluated
        this.current;
        this.complete = false;
        this.brush = 1;
        this.steps = 0;
    }

    handleMouseMove(event) {
        this.mouse.x = event.clientX - this.BOUNDING_BOX.left;
        this.mouse.y = event.clientY - this.BOUNDING_BOX.top;
        this.mouse.tileX = Math.floor(this.mouse.x / this.TILE_SIZE);
        this.mouse.tileY = Math.floor(this.mouse.y / this.TILE_SIZE);
    }

    handleMouseDown(event) {
        const tile = this.grid[this.mouse.tileX][this.mouse.tileY];
        this.brush = (!tile.wall);
        this.mouse.down = true;
    }

    handleMouseUp(event) {
        this.mouse.down = false;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render grid rectangles
        for (let x = 0; x < this.GRID_WIDTH; x++) {
            for (let y = 0; y < this.GRID_HEIGHT; y++) {
                const tile = this.grid[x][y];
                const isStart = (x == this.START[0] && y == this.START[1]);
                const isEnd = (x == this.END[0] && y == this.END[1]);

                // Fill background based on state
                if (tile.wall) {
                    this.ctx.fillStyle = 'black';
                    this.ctx.fillRect(x * this.TILE_SIZE, y * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);
                    continue;
                } else if (isStart || isEnd) {
                    this.ctx.fillStyle = "rgb(36,140,176)";
                } else if (!this.show_set) {
                    continue;
                } else if (this.open.has(tile)) {
                    this.ctx.fillStyle = "rgb(105,193,0)";
                } else if (this.closed.has(tile)) {
                    this.ctx.fillStyle = "rgb(194,16,1)";
                } else continue;

                this.ctx.fillRect(x * this.TILE_SIZE, y * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);
            }
        }

        // Render path
        if (this.show_path && this.steps > 1) {
            let parent = [this.current.x, this.current.y];
            while (!(parent[0] == this.START[0] && parent[1] == this.START[1])) {
                const tile = this.grid[parent[0]][parent[1]];
                this.ctx.fillStyle = "rgb(36,140,176)";
                this.ctx.fillRect(tile.x * this.TILE_SIZE, tile.y * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);
                parent = tile.parent;
            }
        }

        // Render text and borders
        for (let x = 0; x < this.GRID_WIDTH; x++) {
            for (let y = 0; y < this.GRID_HEIGHT; y++) {
                const tile = this.grid[x][y];
                const tileX = x * this.TILE_SIZE;
                const tileY = y * this.TILE_SIZE;
                const centerX = tileX + this.HALF_TILE_SIZE;
                const centerY = tileY + this.HALF_TILE_SIZE;
                const spacing = this.TILE_SIZE * 0.2;
                const isStart = (x == this.START[0] && y == this.START[1]);
                const isEnd = (x == this.END[0] && y == this.END[1]);

                // Border
                this.ctx.strokeStyle = "black";
                this.ctx.strokeRect(tileX, tileY, this.TILE_SIZE, this.TILE_SIZE);

                if (tile.wall) continue;

                // Text
                if (isStart || isEnd) {
                    this.ctx.fillStyle = "black";
                    this.ctx.font = "bold 50px sans-serif";
                    this.ctx.fillText(isStart ? "A" : "B", centerX, centerY);
                } else if (!this.show_cost) {
                    continue;
                } else if (tile.f > 0) {
                    this.ctx.fillStyle = "black";
                    this.ctx.font = "bold 30px sans-serif";
                    this.ctx.fillText(tile.f, centerX, centerY);

                    this.ctx.font = "bold 20px sans-serif";
                    this.ctx.fillText(tile.g, tileX + spacing, tileY + spacing);
                    this.ctx.fillText(tile.h, tileX + this.TILE_SIZE - spacing, tileY + spacing);
                }
            }
        }
    }

    distance(x1, y1, x2, y2) {
        const dx = (x2 * 10) - (x1 * 10);
        const dy = (y2 * 10) - (y1 * 10);
        return Math.round(Math.sqrt(dx * dx + dy * dy));
    }

    heuristic(x, y) {
        return this.distance(x, y, this.END[0], this.END[1]);
    }

    step() {
        if (this.complete) return;
        this.steps++;

        // Find node in OPEN with lowest F cost
        const open_array = [...this.open];
        const lowest_f = Math.min(...open_array.map(tile => tile.f));
        const possible_tiles = open_array.filter(tile => tile.f === lowest_f);
        this.current = possible_tiles[getRandomIntInRange(0, possible_tiles.length - 1)];

        // Remove current from OPEN
        this.open.delete(this.current);
        // Add current to CLOSED
        this.closed.add(this.current);

        // if current == END, path has been found
        if (this.current.x == this.END[0] && this.current.y == this.END[1]) {
            this.complete = true;
            pause();
            return;
        }

        DIRECTION8.forEach((direction) => {
            let new_x = this.current.x + direction[0];
            let new_y = this.current.y + direction[1];

            // Neighbour is not traversable -> return
            if (!inBounds(new_x, new_y, this.GRID_WIDTH, this.GRID_HEIGHT)) return;

            // Neighbour is in CLOSED -> return
            let neighbour = this.grid[new_x][new_y];
            if (neighbour.wall) return;
            if (this.closed.has(neighbour)) return;

            // tentative_gScore = gScore[current] + distance(current, neighbor)
            let temp_g = this.current.g + this.distance(this.current.x, this.current.y, neighbour.x, neighbour.y);

            // If neighbour not in OPEN or new path to neighbour is shorter
            if (!this.open.has(neighbour) || temp_g < neighbour.g) {
                // Set costs of neighbour
                neighbour.g = temp_g;
                neighbour.h = this.heuristic(neighbour.x, neighbour.y);
                neighbour.f = neighbour.g + neighbour.h;

                // Set parent of neighbour to current
                neighbour.parent = [this.current.x, this.current.y];

                // If neighbour is not in OPEN --> add neighbour to OPEN
                this.open.add(neighbour);
            }
        });

        // if OPEN is empty -> no solution is possible
        if (this.open.size == 0) {
            this.complete = true;
            pause();
        }
    }

    place_tile() {
        let tile = this.grid[this.mouse.tileX][this.mouse.tileY];
        if (tile == undefined) return;
        if (this.complete) return;
        if (tile.f != 0) return;
        if (tile.x == this.START[0] && tile.y == this.START[1]) return;
        if (tile != this.brush) {
            this.grid[this.mouse.tileX][this.mouse.tileY].wall = this.brush;
        }
        this.render();
    }

    restart() {
        this.grid = createArray2D(this.GRID_WIDTH, this.GRID_HEIGHT);
        this.open.clear();
        this.closed.clear();
        this.complete = false;
        this.brush = 1;
        this.steps = 0;
        cancelAnimationFrame(this.update);
        this.run();
    }

    update() {
        if (this.mouse.down) {
            this.place_tile();
        }
        requestAnimationFrame(this.update);
    }

    run() {
        // Add start node to open set
        let start_tile = this.grid[this.START[0]][this.START[1]];
        this.open.add(start_tile);

        this.render();

        requestAnimationFrame(this.update);
    }

}

let main = new Main();
main.run();

step_button.onclick = function() {
    main.step();
    main.render();
}

restart_button.onclick = function() {
    main.restart();
    main.render();
}

complete_button.onclick = function() {
    while (!main.complete) {
        main.step();
    }
    main.render();
}

path_button.onclick = function() {
    main.show_path = !main.show_path;
    path_button.textContent = (main.show_path) ? "Show path: ON" : "Show path: OFF";
    main.render();
}

set_button.onclick = function() {
    main.show_set = !main.show_set;
    set_button.textContent = (main.show_set) ? "Show sets: ON" : "Show sets: OFF";
    main.render();
}

cost_button.onclick = function() {
    main.show_cost = !main.show_cost;
    cost_button.textContent = (main.show_cost) ? "Show costs: ON" : "Show costs: OFF";
    main.render();
}

// ----------- Play-Pause -----------
var playing = false;
var intervalId = 0;

function play() {
    main.step();
    main.render();
}

function pause() {
    play_button.textContent = 'Play';
    playing = false;
    clearInterval(intervalId);
}

play_button.onclick = function() {
    if (main.complete) return;
    playing = !playing;
    if (playing) {
        play_button.textContent = 'Pause';
        intervalId = setInterval(play, 50);
    } else pause();
}