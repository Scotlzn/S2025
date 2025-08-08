export default class Tile {
    constructor(x,  y) {
        this.x = x, this.y = y;
        this.piece = 0;
        this.color = 0;
        this.moved = false;
    }
}