import Tile from "./tile.js";

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

export function load_assets(func) {
    const images = [];
    let loaded_images = 0;

    for (let i = 0; i < 5; i++) {
        const img = new Image();
        img.src = `./assets/${i}.png`;

        img.onload = function() {
            images[i] = img;
            loaded_images++;

            if (loaded_images == 5) {
                // Start program when images have loaded
                func(images);
            }
        };

        img.onerror = function() {
            console.error(`Failed to load image: ${i}.png`);
        };
    }
}
