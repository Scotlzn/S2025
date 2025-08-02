    import { getRandomIntInRange, DIRECTION4, inBounds } from "./support.js";

    export default class Maze {
        constructor(main) {
            this.main = main;

            this.maze_step_button = document.getElementById("maze_step_button");
            this.maze_step_button.onclick = () => {
                this.step();
                this.main.render();
            }

            this.visited = [];
            this.current_position = [];
            this.w_start_tunnel = true;
            this.tunnel = 0;
            this.complete = false;
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

            // Start wilsons
            const not_visited = this.main.grid.flat().filter(tile => (!tile.maze && !tile.wall));
            let tile = not_visited[getRandomIntInRange(0, not_visited.length - 1)];
            tile.maze = true;
        }

        w_start_new_tunnel() {
            this.tunnel++;
            const not_visited = this.main.grid.flat().filter(tile => (!tile.maze && !tile.wall));

            // Maze complete
            if (not_visited.length < 1) {
                this.complete = true;
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
            if (this.w_start_tunnel) {
                this.w_start_new_tunnel();
                return;
            }
            let valid_moves = [];
            console.log(this.current_position)
            console.log(this.visited.slice());
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
                // Part of this tunnel -> Skip to this tile and delete branch past then
                let found_tile = false;
                let index = 1;
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

        step() {
            if (this.complete) return;
            this.wilson();
        }
    }