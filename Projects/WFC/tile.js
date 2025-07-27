export default class Tile {
    constructor(position, number_of_tiles) {
        this.position = position;
        this.id = null;
        this.collapsed = false;
        this.options = Array.from({ length: (number_of_tiles) }, (_, i) => i); // 0, 1, 2 ... to number of tiles
    }
}