import Tile from "./tile.js";
import {circuit_data} from "./assets/circuit/circuit.js"
import {pipe_data} from "./assets/pipes/pipes.js"

export function load_all_data() {
    let all_data = [];
    all_data.push(circuit_data);
    all_data.push(pipe_data);
    return all_data;
}

export function get_random_int_in_range(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function create_array_2D(size, number_of_tiles) {
    let output = [];
    for (let x = 0; x < size; x++) {
        let new_line = [];
        for (let y = 0; y < size; y++) {
            new_line.push(new Tile([x, y], number_of_tiles));
        }
        output.push(new_line);
    }
    return output;
}

function create_rotated_image(original_img, angle) {
    // Angle in radians btw
    let temp_canvas = document.createElement('canvas');
    let ctx = temp_canvas.getContext('2d');

    let size = original_img.width;
    temp_canvas.width = size;
    temp_canvas.height = size;

    // Move to center, rotate, draw
    ctx.translate(size * 0.5, size * 0.5);
    ctx.rotate(angle);
    ctx.drawImage(original_img, -size * 0.5, -size * 0.5);

    // Create image from canvas
    const rotated_img = new Image();
    rotated_img.src = temp_canvas.toDataURL();

    return rotated_img;
}

export function load_assets(data, func) {
    const file_names = ["circuit", "pipes"];
    let datasets = [];
    let loaded_datasets = 0;
    for (let dataset = 0; dataset < data.length; dataset++) {
        const tiles = data[dataset]["sockets"].length;
        const rotation_offset = data[dataset]["rotation_offset"];
        const total_images = rotation_offset + ((tiles - rotation_offset) * 4)

        let images = [];
        let loaded_images = 0;

        for (let i = 0; i < tiles; i++) {

            // See if image has to be rotated and load
            const repitions = (i >= rotation_offset) ? 4 : 1;
            const img = new Image();
            img.src = `./assets/${file_names[dataset]}/${i}.png`;
            img.onload = () => {

            for (let j = 0; j < repitions; j++) {

                // Rotate clockwise from 0 rads (straight up)
                let rotated_img = create_rotated_image(img, Math.PI * (j * 0.5));

                rotated_img.onload = function() {
                    // Maintain order of tiles and rotated tiles
                    const index = (i < rotation_offset) ? i : rotation_offset + (i - rotation_offset) * 4 + j;
                    images[index] = rotated_img;
                    loaded_images++;

                    // ONLY start program when ALL images have loaded
                    if (loaded_images == total_images) {
                        datasets[dataset] = images.slice();
                        loaded_datasets++;
                        if (loaded_datasets == data.length) {
                            func(datasets);
                        }
                    }
                };

                rotated_img.onerror = function() {
                    let angle = (Math.PI * (j * 0.5)) * (180 / Math.PI);
                    console.error(`Image: ${i}, Rotation: ${angle} degrees, failed to load!`);
                };
            }

            }
        }
    }
}

function generate_rotated_sockets(sockets, tiles, rotation_offset) {
    let all_sockets = [];

    // Sockets of non-rotated tiles are unchanged
    for (let i = 0; i < rotation_offset; i++) {
        all_sockets.push(sockets[i]);
    }

    // Rotate all other sockets
    for (let i = rotation_offset; i < tiles; i++) {
        let tile_sockets = sockets[i];
        for (let rotation = 0; rotation < 4; rotation++) {
            all_sockets.push(tile_sockets.slice());
            tile_sockets.unshift(tile_sockets.pop());
        }
    }
    return all_sockets;
}

function reverse3(str) {
    return str[2] + str[1] + str[0];
}

export function find_all_possible_options(non_rotated_sockets, tiles, rotation_offset) {
    // Using 2D array for options -> [Tile][Direction]
    const OPPOSITE_DIRECTIONS = [2, 3, 0, 1];
    const total_tiles = rotation_offset + ((tiles - rotation_offset) * 4);
    const sockets = generate_rotated_sockets(non_rotated_sockets, tiles, rotation_offset);
    let options = [];

    // Handle all tiles at once
    for (let original_tile = 0; original_tile < total_tiles; original_tile++) {
        const original_sockets = sockets[original_tile];
        options[original_tile] = [[], [], [], []]; // Initialise directions to prevent error

        for (let direction = 0; direction < 4; direction++) {
            const target_sockets = reverse3(original_sockets[direction]);
            const opposite = OPPOSITE_DIRECTIONS[direction];

            for (let tile = 0; tile < total_tiles; tile++) {
                const tile_sockets = sockets[tile];
                if (target_sockets === tile_sockets[opposite]) {
                    options[original_tile][direction].push(tile);
                }
            }
        }
    }

    return options;
}
