import { generate_array_2D, get_random_int_in_range } from "./support.js";

var restart_button = document.getElementById("restart_button");
var bombs_ui = document.getElementById("ui_bombs");
var timer_ui = document.getElementById("ui_time");

class Main {
    constructor(width, height, bombs) {
        this.canvas = document.getElementById("canvas");
        this.ctx = canvas.getContext('2d');
        this.BOUNDING_BOX = canvas.getBoundingClientRect();

        this.DIRECTIONS8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
        this.GRID_WIDTH = width, this.GRID_HEIGHT = height;

        // Ensure no pixel rounding
        this.PERFECT_W = Math.round(this.canvas.width / this.GRID_WIDTH) * this.GRID_WIDTH;
        this.PERFECT_H = Math.round(this.canvas.height / this.GRID_HEIGHT) * this.GRID_HEIGHT;
        this.canvas.width = this.PERFECT_W;
        this.canvas.height = this.PERFECT_H;

        this.WIDTH = this.canvas.width;
        this.HEIGHT = this.canvas.height;
        this.TILE_SIZE = this.WIDTH / this.GRID_WIDTH;
        this.HALF_TILE_SIZE = this.TILE_SIZE * 0.5;

        this.grid = generate_array_2D(this.GRID_WIDTH, this.GRID_HEIGHT);

        this.ctx.imageSmoothingEnabled = false;
        let text_size = 103.73714016 * (0.92210791 ** (this.GRID_WIDTH - 1))
        this.ctx.font = `bold ${text_size}px sans-serif`;
        this.ctx.fillStyle = 'black';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.BOMBS = bombs;
        this.FLAGS = this.BOMBS;
        bombs_ui.textContent = `Flags: ${this.FLAGS}`;

        this.seconds = 0;
        this.interval;

        this.first_click = true;
        this.over = false;
    }

    format_time(secs) {
        let mins = Math.floor(secs / 60);
        let secsLeft = secs % 60;
        return String(mins).padStart(2, '0') + ':' + String(secsLeft).padStart(2, '0');
    }

    spawn_bombs(avoidx, avoidy) {

        // Avoid 3x3 around 1st mouse click (so you dont lose instantly)
        this.grid[avoidx][avoidy].avoid = true;
        this.DIRECTIONS8.forEach((direction) => {
            const current_position = [avoidx + direction[0], avoidy + direction[1]];
            if (current_position[0] < 0 || current_position[0] >= this.GRID_WIDTH || current_position[1] < 0 || current_position[1] >= this.GRID_HEIGHT) {
                return;
            }
            this.grid[current_position[0]][current_position[1]].avoid = true;
        }); 

        // Spawn bombs
        for (let i = 0; i < this.FLAGS; i++) {
            const flat_grid = this.grid.flat();
            // Exclude bombs and area that should be avoided
            const bombs_excluded = flat_grid.filter(tile => (!tile.bomb && !tile.avoid));
            const index = get_random_int_in_range(0, bombs_excluded.length - 1);
            const chosen_tile = bombs_excluded[index];
            chosen_tile.bomb = true;
        }
    }

    generate_numbers() {
        // Go through every tile and see how many bombs are around
        for (let x = 0; x < this.GRID_WIDTH; x++) {
            for (let y = 0; y < this.GRID_HEIGHT; y++) {
                let bomb_count = 0;
                this.DIRECTIONS8.forEach((direction) => {
                    const current_position = [x + direction[0], y + direction[1]];
                    if (current_position[0] < 0 || current_position[0] >= this.GRID_WIDTH || current_position[1] < 0 || current_position[1] >= this.GRID_HEIGHT) {
                        return;
                    }
                    let tile = this.grid[current_position[0]][current_position[1]];
                    if (!tile.bomb) return;
                    bomb_count++;
                });
                this.grid[x][y].number = bomb_count;
            }
        }
    }

    fill(x, y) {
        this.DIRECTIONS8.forEach((direction) => {
            const new_x = x + direction[0];
            const new_y = y + direction[1];
            if (new_x < 0 || new_x >= this.GRID_WIDTH || new_y < 0 || new_y >= this.GRID_HEIGHT) {
                return;
            }
            let tile = this.grid[new_x][new_y];
            if (tile.opened) return;
            if (tile.number != 0) {
                tile.opened = true;
                return;
            }
            this.grid[new_x][new_y].opened = true;
            this.fill(new_x, new_y);
        });
    }

    flood_fill(x, y) {
        this.grid[x][y].opened = true;
        this.fill(x, y);
    }

    right_click(tile, tileX, tileY) {
        if (tile.opened) return;
        if (this.FLAGS < 1) return;
        if (!tile.flagged) {
            tile.flagged = true;
            this.FLAGS--;
        } else {
            tile.flagged = false;
            this.FLAGS++;
        }
        bombs_ui.textContent = `Flags: ${this.FLAGS}`;
    }

    left_click(tile, tileX, tileY) {

        if (tile.flagged) return;

        if (tile.bomb) {
            this.over = true;
            bombs_ui.textContent = 'You lose :(';
            this.end();
            return;
        }

        if (this.first_click) {
            this.first_click = false;
            this.spawn_bombs(tileX, tileY);
            this.generate_numbers();
            this.flood_fill(tileX, tileY);
            this.interval = setInterval(() => {
                this.seconds++;
                timer_ui.textContent = `Time: ${this.format_time(this.seconds)}`;
            }, 1000);
        }

        if (tile.number == 0) {
            this.flood_fill(tileX, tileY);
        }

        tile.opened = true;

        // Check for game won
        const not_bombs = this.grid.flat().filter(tile => !tile.bomb)
        if (not_bombs.every(tile => tile.opened === true)) {
            bombs_ui.textContent = 'You win!';
            this.end();
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        for (let x = 0; x < this.GRID_WIDTH; x++) {
            for (let y = 0; y < this.GRID_HEIGHT; y++) {
                let tile = this.grid[x][y];

                if (!tile.opened) {
                    this.ctx.fillStyle = 'lightgrey';
                    this.ctx.fillRect(x * this.TILE_SIZE, y * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);
                }

                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x * this.TILE_SIZE, y * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);

                if (tile.bomb && this.over) {
                    this.ctx.beginPath();
                    this.ctx.arc(x * this.TILE_SIZE + this.HALF_TILE_SIZE, y * this.TILE_SIZE + this.HALF_TILE_SIZE, this.HALF_TILE_SIZE * 0.5, 0, 2 * Math.PI, false);
                    this.ctx.fillStyle = 'black';
                    this.ctx.fill();
                    this.ctx.closePath();
                    continue;
                }
                
                if (tile.opened && tile.number != 0) {
                    this.ctx.fillStyle = 'black';
                    this.ctx.fillText(tile.number.toString(), x * this.TILE_SIZE + this.HALF_TILE_SIZE, y * this.TILE_SIZE + this.HALF_TILE_SIZE);
                }
                
                if (tile.flagged) {
                    let midpoint = [x * this.TILE_SIZE + this.HALF_TILE_SIZE, y * this.TILE_SIZE + this.HALF_TILE_SIZE];
                    let size = this.TILE_SIZE * 0.25;
                    this.ctx.fillStyle = 'black';
                    this.ctx.beginPath();
                    this.ctx.moveTo(midpoint[0] - size, midpoint[1]);
                    this.ctx.lineTo(midpoint[0] + size, midpoint[1] - size);
                    this.ctx.lineTo(midpoint[0] + size, midpoint[1] + size);
                    this.ctx.fill();
                }
            }
        }
    }

    end() {
        clearInterval(this.interval);

        // Open whole map
        for (let x = 0; x < this.GRID_WIDTH; x++) {
            for (let y = 0; y < this.GRID_HEIGHT; y++) {
                let tile = this.grid[x][y];
                if (tile.bomb) continue;
                tile.opened = true;
            }
        }
    }

    restart() {
        clearInterval(this.interval);
        this.seconds = 0;
        bombs_ui.textContent = `Flags: ${this.FLAGS}`;
        this.grid = generate_array_2D(this.GRID_WIDTH, this.GRID_HEIGHT);
        this.first_click = true;
        this.over = false;
        this.FLAGS = this.BOMBS;
    }

    run() {
        this.render();
    }
}

let main = new Main(10, 10, 15);
main.run();

// ------------------- UI -------------------------

restart_button.onclick = function() {
    main.restart();
    main.render();
}

main.canvas.addEventListener('mousedown', function(event) {
    if (main.over) return;
    let mouseX = event.clientX - main.BOUNDING_BOX.left;
    let mouseY = event.clientY - main.BOUNDING_BOX.top;
    let tileX = Math.floor(mouseX / main.TILE_SIZE);
    let tileY = Math.floor(mouseY / main.TILE_SIZE);
    let tile = main.grid[tileX][tileY];
    switch (event.button) {
        case 2:
            main.right_click(tile, tileX, tileY);
            break;
        default:
            main.left_click(tile, tileX, tileY);
            break;
    }
    main.render();
});

// ------------ NAVBAR UI -----------

const dropdowns = document.querySelectorAll('.dropdown');
const dropbuttons = document.querySelectorAll('.dropbtn');

// Dropdown's visability toggles when clicked
dropbuttons.forEach((button, index) => {
    button.onclick = function() {
        dropdowns[index].classList.toggle('show');
    }
});

// Close the dropdown if the user clicks outside of it
window.addEventListener('click', function(event) {
    dropdowns.forEach((dropdown) => {
        if (!dropdown.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    });
});

// Dropdown functionality
// Difficulty settings
const settings = {
    0: {
        "width": 10,
        "height": 10,
        "bombs": 15
    },
    1: {
        "width": 20,
        "height": 20,
        "bombs": 60
    },
    2: {
        "width": 20,
        "height": 20,
        "bombs": 100
    }
}
const dropdown_content = document.getElementById("dropdown-content");
let buttonsArray = Array.from(dropdown_content.childNodes).filter(node => node.nodeName.toLowerCase() === 'button');
buttonsArray.forEach((button, index) => {
    button.onclick = function() {
        let width = settings[index]["width"];
        let height = settings[index]["height"];
        let bombs = settings[index]["bombs"];
        clearInterval(main.interval);
        main = new Main(width, height, bombs);
        main.render();
        dropbuttons[0].textContent = button.textContent;
        dropdowns[0].classList.remove('show');
    }
});