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

export function loadFromFEN(fen) {
    let grid = createArray2D(8, 8);
    let file = 0, rank = 0;
    fen.split('').forEach((char) => {
        if (char == "/") {
            file++;
            rank = 0;
        } else if (Object.values(PIECES).includes(char)) {
            let piece = Object.keys(PIECES).find(key => PIECES[key] === char);
            piece = parseInt(piece); // Convert piece to int from string
            let color = (piece < 7) ? 1 : 2;
            let tile = grid[rank][file];
            
            tile.piece = piece; 
            tile.color = color;

            rank++;
        } else {
            rank += parseInt(char);
        }
    });
    return grid;
}