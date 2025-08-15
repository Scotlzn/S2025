export const DIRECTION4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const DIRECTION8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

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
            new_line[y] = 0;
        }
        output[x] = new_line;
    }
    return output;
}

export function countBits(n) {
    let count = 0;
    while (n) {
        n &= n - 1;
        count++;
    }
    return count;
}