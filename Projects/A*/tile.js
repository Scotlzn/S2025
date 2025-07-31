export default class Tile {
    constructor(x, y) {
        this.x = x, this.y = y;
        this.g = 0;
        this.h = 0;
        this.f = this.g + this.h;
        this.parent = [];
        this.wall = false;
    }
}