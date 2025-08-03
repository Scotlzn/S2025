    import { getRandomIntInRange, DIRECTION4, inBounds, createArray2D } from "./support.js";

    export default class Maze {
        constructor(main) {
            this.main = main;

            this.step_button = document.getElementById("maze_step_button");
            this.step_button.onclick = () => {
                if (!this.active) return;
                this.step();
                this.main.render();
            }

            this.complete_button = document.getElementById("maze_complete_button");
            this.complete_button.onclick = () => {
                if (!this.active) return;
                if (this.complete) this.restart_maze();
                while (!this.complete) {
                    this.step();
                }
                this.main.render();
            }

            this.ALGORITHMS = ["Wilson", "Aldous-Broder", "ABW"];
            this.algorithm = 2;
            this.algorithm_button = document.getElementById("maze_algorithm_button");
            this.algorithm_button.onclick = () => {
                this.algorithm = (this.algorithm + 1) % this.ALGORITHMS.length;
                this.algorithm_button.innerHTML = "Maze algorithm: <br>" + this.ALGORITHMS[this.algorithm];
                if (!this.active) return;
                this.restart_maze();
            }

            this.maze_ui_button = document.getElementById("maze_button");
            this.maze_ui_button.onclick = () => {
                this.show_path = !this.show_path;
                this.maze_ui_button.textContent = (this.show_path) ? "Show maze path: ON" : "Show maze path: OFF";
                this.main.render();
            }

            // --------- Play-Pause ---------
            this.playing = false;
            this.intervalId = 0;
            this.play_button = document.getElementById("maze_play_button");
            this.play_button.onclick = () => {
                if (this.complete || !this.active) return;
                this.playing = !this.playing;
                if (this.playing) {
                    this.play_button.textContent = 'Maze pause';
                    this.intervalId = setInterval(() => this.play(), 50);
                } else this.pause();
            }

            const total_cells = ((this.main.GRID_WIDTH - 1) / 2) ** 2;
            this.ab_cutoff = Math.floor(total_cells * 0.25);

            this.active = false;
            this.visited = [];
            this.current_position = [];
            this.w_start_tunnel = true;
            this.tunnel = 0;
            this.complete = false;
            this.steps = 0;
            this.show_path = true;
            this.cells_visited = 0;
        }

        play() {
            this.step();
            this.main.render();
        }

        pause() {
            this.play_button.textContent = 'Maze play';
            this.playing = false;
            clearInterval(this.intervalId);
        }

        restart_maze() {
            this.main.open.clear();
            this.main.closed.clear();
            this.main.complete = false;
            this.main.steps = 0;
            let start_tile = this.main.grid[this.main.START[0]][this.main.START[1]];
            this.main.open.add(start_tile);
            this.restart();
            this.generate();
            this.main.render();
        }

        restart() {
            this.main.grid = createArray2D(this.main.GRID_WIDTH, this.main.GRID_HEIGHT);
            this.cells_visited = 0;
            this.steps = 0;
            this.tunnel = 0;
            this.complete = false;
            this.w_start_tunnel = true;
            this.visited = [];
            this.current_position = [];
        }

        generate() {
            this.main.START = [1, 1];
            this.main.END = [this.main.GRID_WIDTH - 2, this.main.GRID_HEIGHT - 2];
            for (let x = 0; x < this.main.GRID_WIDTH; x++) {
                for (let y = 0; y < this.main.GRID_HEIGHT; y++) {
                    let tile = this.main.grid[x][y];
                    if ((x % 2 == 0) || (y % 2 == 0)) {
                        tile.wall = true;
                    }
                }
            }
        }

        w_start_new_tunnel() {
            this.tunnel++;
            const not_visited = this.main.grid.flat().filter(tile => (!tile.maze && !tile.wall));

            // Maze complete
            if (not_visited.length < 1) {
                this.complete = true;
                this.pause();
                this.show_path = false;
                this.maze_ui_button.textContent = "Show maze path: OFF";
                return;
            }

            let tile = not_visited[getRandomIntInRange(0, not_visited.length - 1)];
            tile.maze = true;
            tile.tunnel = this.tunnel;
            this.visited.splice(0,this.visited.length) // Hard clear
            this.w_start_tunnel = false;
            this.current_position = [tile.x, tile.y];
            this.visited.push(tile);
        }

        wilson() {
            if (this.steps == 1) {
                // Start wilsons by choosing a random non-visited tile
                const not_visited = this.main.grid.flat().filter(tile => (!tile.maze && !tile.wall));
                let tile = not_visited[getRandomIntInRange(0, not_visited.length - 1)];
                tile.maze = true;
                return;
            }
            if (this.w_start_tunnel) {
                this.w_start_new_tunnel();
                return;
            }

            // Find all possible tiles (all walls in-between) surrounding current tile (no diagonals)
            let valid_moves = [];
            DIRECTION4.forEach((direction) => {
                const x = this.current_position[0] + direction[0] * 2;
                const y = this.current_position[1] + direction[1] * 2;
                if (!inBounds(x, y, this.main.GRID_WIDTH, this.main.GRID_HEIGHT)) return;

                // Exclude direction where I just came from
                if (this.visited.length >= 2) {
                    const came_from = this.visited[this.visited.length - 2];
                    if (x == came_from.x && y == came_from.y) return;
                }

                const tile = this.main.grid[x][y];
                const wall = [this.current_position[0] + direction[0], this.current_position[1] + direction[1]];

                valid_moves.push({tile, wall});
            });

            const chosen = valid_moves[getRandomIntInRange(0, valid_moves.length - 1)];
            const { tile, wall } = chosen;

            // If the tile is empty
            if (!tile.maze) {
                // Remove wall
                const wall_tile = this.main.grid[wall[0]][wall[1]];
                tile.connected_wall = wall;
                wall_tile.wall = false;
                wall_tile.maze = true;

                // Move into tile
                tile.maze = true;
                tile.tunnel = this.tunnel;
                this.current_position = [tile.x, tile.y];
                this.visited.push(tile);
                return;
            }

            if (tile.tunnel == this.tunnel) {
                // Part of this tunnel -> Skip to this tile and delete branch since then
                let found_tile = false;
                let index = 1;
                // Backtrack through visited tiles in the tunnel until reaching the tile it moved into
                while (!found_tile) {
                    const last_tile = this.visited[this.visited.length - index];
                    const last_wall = this.main.grid[last_tile.connected_wall[0]][last_tile.connected_wall[1]];
                    last_tile.maze = false;
                    last_wall.maze = false;
                    last_wall.wall = true;
                    index++;
                    const checking = this.visited[this.visited.length - index];
                    found_tile = (checking.x == tile.x && checking.y == tile.y);
                }
                this.current_position = [tile.x, tile.y];
            } else {
                // Not part of the tunnel? -> part of the maze -> start new tunnel
                const wall_tile = this.main.grid[wall[0]][wall[1]];
                wall_tile.wall = false;
                wall_tile.maze = true;
                this.w_start_tunnel = true;
            }
        }

        aldous_broder() {
            if (this.steps == 1) {
                // Start Aldous Broder by picking a random tile
                const non_walls = this.main.grid.flat().filter(tile => !tile.wall);
                let tile = non_walls[getRandomIntInRange(0, non_walls.length - 1)];
                this.current_position = [tile.x, tile.y];
                tile.maze = true;
                return;
            }

            // Stop algorithm when there are no unvisited cells
            const unvisited_cells = this.main.grid.flat().filter(tile => !tile.wall && !tile.maze);
            if (unvisited_cells.length == 0) {
                this.complete = true;
                this.pause();
                this.show_path = false;
                this.maze_ui_button.textContent = "Show maze path: OFF";
                return;
            }

            // Pick a random neighbour
            let valid_moves = [];
            DIRECTION4.forEach((direction) => {
                const x = this.current_position[0] + direction[0] * 2;
                const y = this.current_position[1] + direction[1] * 2;
                if (!inBounds(x, y, this.main.GRID_WIDTH, this.main.GRID_HEIGHT)) return;
                let tile = this.main.grid[x][y];
                let wall = this.main.grid[this.current_position[0] + direction[0]][this.current_position[1] + direction[1]];
                valid_moves.push({tile, wall});
            });

            const chosen = valid_moves[getRandomIntInRange(0, valid_moves.length - 1)];
            const {tile, wall} = chosen;

            // If this neighbour has not been visited -> remove wall between current tile and neighbour
            if (!tile.maze) {
                tile.maze = true;
                wall.maze = true;
                wall.wall = false;
                this.cells_visited++;
            }

            // Move into the neighbour
            this.current_position = [tile.x, tile.y];
        }

        step() {
            if (this.complete) return;
            this.steps++;

            if (this.algorithm == 0) {
                this.wilson();

            } else if (this.algorithm == 1) {
                this.aldous_broder();

            // Hybrid, Starting with Aldous broder
            } else if (this.algorithm == 2) {
                // Switches to wilson's algorithm once the cutoff has been surpassed
                if (this.cells_visited < this.ab_cutoff) {
                    this.aldous_broder();
                } else {
                    this.wilson();
                }
            }
        }
    }