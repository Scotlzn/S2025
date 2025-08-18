export function getRandomIntInRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function rectangleCollision(a, b) {
    return (a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1]);
}

export function inBounds(position, originalX, maxX, length) {
    if (position < 0 || position >= length) return false;
    const x = position % maxX;
    return Math.abs(x - originalX) <= 1;     // horizontal wrap check
}

export function forEachSetBit(bitset, cb) {
    for (let w = 0; w < bitset.length; w++) {
        let word = bitset[w] >>> 0;
        while (word) {
            const lsb = word & -word;
            const bit = (w << 5) + (31 - Math.clz32(lsb));
            cb(bit);
            word ^= lsb;
        }
    }
}

export function isBitsetEmpty(bs) {
    for (let i = 0; i < bs.length; i++) if (bs[i] !== 0) return false;
    return true;
}

// Only keeps common elements between both bitsets in the tileBitset
export function applyBitsetContraints(tileBitset, newBitset) {
    let hasChanged = false;
    for (let i = 0; i < tileBitset.length; i++) {
        const oldWord = tileBitset[i];
        tileBitset[i] &= newBitset[i];
        if (tileBitset[i] != oldWord) {
            hasChanged = true;
        }
    }
    return hasChanged;
}

export function makeSingletonBitset(bitsetSize, tileIndex) {
        const bitset = new Uint32Array(bitsetSize);
        const word = Math.floor(tileIndex / 32);
        const bit = tileIndex % 32;
        bitset[word] = 1 << bit;
        return bitset;
    }

export function getRandomMinimumElement(array) {
    let minValue = Infinity;
    const minIndexes = [];

    for (let i = 0; i < array.length; i++) {
        const e = array[i];
        if (e == 0) continue;

        if (e < minValue) {
            minValue = e;
            minIndexes.length = 0;
            minIndexes.push(i);
        } else if (e == minValue) {
            minIndexes.push(i);
        }
    }
    if (minIndexes.length == 0) return undefined;

    return minIndexes[getRandomIntInRange(0, minIndexes.length - 1)];
}