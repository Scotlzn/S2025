class Cell {
    constructor(defaultOptions) {
        this.options = defaultOptions;
        this.collapsed = false;
    }
}

export default class CellManager {

    constructor(main) {
        this.main = main;

        this.totalTiles;
        this.uniqueTiles;
        this.indexToFrequency;
        this.bitsetSize;
        this.unusedBits;
    }

    popcount32(x) { // Using SWAR popcount
        x -= (x >>> 1) & 0x55555555;
        x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
        x = (x + (x >>> 4)) & 0x0F0F0F0F;
        return (x * 0x01010101) >>> 24;
    }

    countBits(bitset) {
        let count = 0;
        for (let i = 0; i < bitset.length; i++) {
            count += this.popcount32(bitset[i]);
        }
        return count;
    }

    calculateEntropy(tile) {
        return this.countBits(tile.options);
    }

    generateFullBitset() {
        const bitset = new Uint32Array(this.bitsetSize);
        bitset.fill(0xFFFFFFFF); // This is the 32 bit int limit
        return bitset;
    }

    generateGrid(size) {
        const output = [];
        const fullBitset = this.generateFullBitset();
        for (let i = 0; i < size; i++) {
            const tileBitset = new Uint32Array(fullBitset.length);
            tileBitset.set(fullBitset);
            output[i] = new Cell(tileBitset);
        }
        return output;
    }

    getWeightedAverageColor(tileBitset) {
        let totalR = 0, totalG = 0, totalB = 0;
        let totalWeight = 0;

        for (let word = 0; word < this.bitsetSize; word++) {
            let m = tileBitset[word];

            if (word === this.bitsetSize - 1 && this.unusedBits > 0) {
                m &= (0xFFFFFFFF >>> this.unusedBits);
            }

            while (m !== 0) {
                const n = (m & -m) >>> 0;
                const bit = Math.log2(n);
                const index = word * 32 + bit;

                const r = this.main.tileManager.tileCentres[index * 4];
                const g = this.main.tileManager.tileCentres[index * 4 + 1];
                const b = this.main.tileManager.tileCentres[index * 4 + 2];

                const weight = this.indexToFrequency.get(index);

                totalR += r * weight;
                totalG += g * weight;
                totalB += b * weight;
                totalWeight += weight;

                m &= ~n;
            }
        }

        if (totalWeight === 0) return undefined;

        return [
            Math.round(totalR / totalWeight),
            Math.round(totalG / totalWeight),
            Math.round(totalB / totalWeight)
        ];
    }

    getWeightedRandomTile(tileBitset) {

        let totalWeight = 0;

        // Find total weight (sum of frequencies) of valid tiles
        for (let word = 0; word < this.bitsetSize; word++) {
            let m = tileBitset[word];

            // Mask out unused bits in the last word
            if (word === this.bitsetSize - 1 && this.unusedBits > 0) {
                m &= (0xFFFFFFFF >>> this.unusedBits);
            }

            while (m !== 0) {
                const n = (m & -m) >>> 0;
                const bit = Math.log2(n);
                const index = word * 32 + bit;

                totalWeight += this.indexToFrequency.get(index);

                m &= ~n;
            }
        }

        // Random number in the interval [0, totalWeight)
        let r = Math.random() * totalWeight;

        for (let word = 0; word < this.bitsetSize; word++) {
            let m = tileBitset[word];

            // Mask out unused bits in the last word
            if (word == this.bitsetSize - 1 && this.unusedBits > 0) {
                m &= (0xFFFFFFFF >>> this.unusedBits);
            }

            // Iterate only over set bits
            while (m != 0) {
                // Only the lowest set bit
                const n = (m & -m) >>> 0; 

                // Bit position: [0, 31]
                const bit = Math.log2(n); 
                    
                // Index in the bitset
                const index = word * 32 + bit;     

                // Use weighted random selection
                r -= this.indexToFrequency.get(index);
                if (r < 0) return index;

                // Clear the lowest set bit
                m &= ~n; 
            }
        }

        // Nothing has been selected (shouldn't happen)
        return undefined; 
    }
}