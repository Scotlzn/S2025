export default class AdjacenciesManager {
    constructor(tileManager) {
        this.tm = tileManager;

        this.OPPOSITE_DIRECTIONS = [2, 3, 0, 1];
        this.TILE_SIZE = this.tm.TILE_SIZE;
        this.CENTRE_INDEX = Math.floor(this.TILE_SIZE * 0.5);

        this.LOOP_LIMITS = {
            0: { maxX: this.TILE_SIZE,         maxY: this.CENTRE_INDEX + 1 }, // UP
            1: { maxX: this.CENTRE_INDEX + 1,  maxY: this.TILE_SIZE },        // RIGHT
            2: { maxX: this.TILE_SIZE,         maxY: this.CENTRE_INDEX + 1 }, // DOWN
            3: { maxX: this.CENTRE_INDEX + 1,  maxY: this.TILE_SIZE },        // LEFT
        };

        this.numTiles = this.tm.uniqueTiles; 
        this.bitsPerTile = this.TILE_SIZE * this.TILE_SIZE * 4;
        this.bitsetSize = Math.ceil(this.numTiles / 32);

        this.allAdjacencyData = new Uint32Array(this.numTiles * 4 * this.bitsetSize); // 4 directions
    }

    generateFullBitset() {
        const bitset = new Uint32Array(this.bitsetSize);
        bitset.fill(0xFFFFFFFF); // This is the 32 bit int limit
        return bitset;
    }

    applyBitsetContraints(tileBitset, newBitset) {
        // Only keeps common elements between both bitsets in the tileBitset
        for (let i = 0; i < tileBitset.length; i++) {
            tileBitset[i] &= newBitset[i];
        }
    }

    compareDirections(firstTileData, secondTileData, direction) {
        const TILE_SIZE = this.TILE_SIZE;
        const CENTRE_INDEX = this.CENTRE_INDEX;

        // Compares the opposite halves of the tile (including the centre) in the same direction
        // To determine if the tiles can overlap
        const calculateIndices = {
            0: (x, y) => [ (y * TILE_SIZE + x) * 4, ((CENTRE_INDEX + y) * TILE_SIZE + x) * 4 ], // UP
            1: (x, y) => [ (y * TILE_SIZE + (x + CENTRE_INDEX)) * 4, (y * TILE_SIZE + x) * 4 ], // RIGHT
            2: (x, y) => [ ((CENTRE_INDEX + y) * TILE_SIZE + x) * 4, (y * TILE_SIZE + x) * 4 ], // DOWN
            3: (x, y) => [ (y * TILE_SIZE + x) * 4, (y * TILE_SIZE + (x + CENTRE_INDEX)) * 4 ], // LEFT
        };

        const { maxX, maxY } = this.LOOP_LIMITS[direction];
        const indices = calculateIndices[direction];

        for (let y = 0; y < maxY; y++) {
            for (let x = 0; x < maxX; x++) {
                const [firstTileIndex, secondTileIndex] = indices(x, y);

                // Compare RGB values for each pixel
                for (let k = 0; k < 3; k++) {
                    if (firstTileData[firstTileIndex + k] != secondTileData[secondTileIndex + k]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    checkDirection(firstTile, firstTileData, direction) {

        const bitset = new Uint32Array(this.bitsetSize);

        for (let secondTile = 0; secondTile < this.numTiles; secondTile++) {
            const secondTileData = this.tm.indexToTile.get(secondTile);
            if (!(this.compareDirections(firstTileData, secondTileData, direction))) continue;

            const word = Math.floor(secondTile / 32); // A word is a single int32
            const bit = secondTile % 32;

            // The mask is an integer where the only 1 at the bit position
            const mask = 1 << bit;
            
            // Bitwise OR the mask onto the bitset
            bitset[word] |= mask;
        }

        const totalIndex = (firstTile * 4 + direction) * this.bitsetSize;
        this.allAdjacencyData.set(bitset, totalIndex);
    }

    precompute() {
        for (let firstTile = 0; firstTile < this.numTiles; firstTile++) {
            const firstTileData = this.tm.indexToTile.get(firstTile);
            for (let direction = 0; direction < 4; direction++) {
                this.checkDirection(firstTile, firstTileData, direction);
            }
        }
    }
}