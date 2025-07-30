export default class Tile {
    constructor(x, y) {
        this.position = [x, y];
        this.opened = false;
        this.bomb = false;
        this.number = 0;
        this.avoid = false;
        this.flagged = false;
    }
}