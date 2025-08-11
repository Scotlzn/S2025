import Tile from "./tile.js";

export const DIRECTION4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const DIRECTION4C = [[1, -1], [1, 1], [-1, 1], [-1, -1]];
export const DIRECTION8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

export const PIECES = {
    1: 'P',
    2: 'N',
    3: 'B',
    4: 'R',
    5: 'Q',
    6: 'K',
    7: 'p',
    8: 'n',
    9: 'b',
    10: 'r',
    11: 'q',
    12: 'k'
}

export const COORDINATES = {
    "a": 0,
    "b": 1,
    "c": 2,
    "d": 3,
    "e": 4,
    "f": 5,
    "g": 6,
    "h": 7
}

export function isUpper(str) {
    return str === str.toUpperCase() && str !== str.toLowerCase();
}

export function isLower(str) {
    return str === str.toLowerCase() && str !== str.toUpperCase();
}

export function getRandomIntInRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function rectangleCollision(a, b) {
    return (a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1]);
}

export function inBounds(x, y, maxX, maxY) {
    return ((x >= 0) && (x < maxX) && (y >= 0) && (y < maxY));
}

export function createArray2D(width, height) {
    const output = [];
    for (let x = 0; x < width; x++) {
        const new_line = [];
        for (let y = 0; y < height; y++) {
            new_line[y] = new Tile(x, y);
        }
        output[x] = new_line;
    }
    return output;
}


export function load_assets(func) {
    const img = new Image();
    img.src = './path';
    img.onload = function() {
        func(img);
    };
}