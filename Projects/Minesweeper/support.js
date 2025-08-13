import Tile from "./tile.js"

export function get_random_int_in_range(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function inBounds(x, y, maxX, maxY) {
    return ((x >= 0) && (x < maxX) && (y >= 0) && (y < maxY));
}

export function generate_array_2D(w, h) {
    const output = [];
    for (let x = 0; x < w; x++) {
        const new_line = [];
        for (let y = 0; y < h; y++) {
            new_line[y] = new Tile(x, y);
        }
        output[x] = new_line;
    }
    return output;
}