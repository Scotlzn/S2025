import { getRandomMinimumElement, inBounds, forEachSetBit, isBitsetEmpty, applyBitsetContraints, makeSingletonBitset } from "./support.js";
import TileManager from "./tile.js";
import CellManager from "./cell.js";

let playButton = document.getElementById("playButton");
let stepButton = document.getElementById("stepButton");
let resetButton = document.getElementById("resetButton");

let entropyButton = document.getElementById("entropyButton");
let gridButton = document.getElementById("gridButton");

class Main {
    constructor() {
        this.canvas = document.getElementById("canvas");
        this.ctx = this.canvas.getContext('2d');

        this.GRID_WIDTH = 50, this.GRID_HEIGHT = 50;
        this.PLAY_SPEED = 0.001;

        this.TILE_SIZE = this.canvas.width / this.GRID_WIDTH;
        this.HALF_TILE_SIZE = this.TILE_SIZE * 0.5;
        this.DIRECTION4 = [-this.GRID_WIDTH, 1, this.GRID_WIDTH, -1];
        
        // Prevent sub-pixel values
        this.PERFECT_W = Math.round(this.canvas.width / this.TILE_SIZE) * this.TILE_SIZE;
        this.PERFECT_H = Math.round(this.canvas.height / this.TILE_SIZE) * this.TILE_SIZE;
        this.canvas.width = this.PERFECT_W;
        this.canvas.height = this.PERFECT_H;
        this.BOUNDING_BOX = this.canvas.getBoundingClientRect();

        // -------------- MOUSE EVENTS -----------
        this.mouse = { x: 0, y: 0, tileX: 0, tileY: 0, down: false };
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // -------------------TEXT ---------------
        const textScale = 250 / this.GRID_WIDTH;
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.font = `bold ${textScale}px sans-serif`;
        this.ctx.fillStyle = 'black';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Rendering
        this.renderCanvas = document.createElement("canvas");
        this.renderCtx = this.renderCanvas.getContext('2d');
        this.renderCanvas.width = this.GRID_WIDTH;
        this.renderCanvas.height = this.GRID_HEIGHT;

        this.showGrid = false;
        this.showEntropy = false;

        this.tileManager = new TileManager(this);
        this.cellManager = new CellManager(this);

        // Array of entropies so I dont have to calculate of them each time
        this.entropy = new Uint16Array(this.GRID_WIDTH * this.GRID_HEIGHT);

        this.PLAY_INTERVAL_ID = 0;
        this.playing = false;
        this.complete = false;

        this.adjacenciesManager;
        this.grid;
        this.displayGrid; 
    }

    handleMouseMove(event) {
        this.mouse.x = event.clientX - this.BOUNDING_BOX.left;
        this.mouse.y = event.clientY - this.BOUNDING_BOX.top;
        this.mouse.tileX = Math.floor(this.mouse.x / this.TILE_SIZE);
        this.mouse.tileY = Math.floor(this.mouse.y / this.TILE_SIZE);
    }

    handleMouseDown(event) {
        this.mouse.down = true;
    }

    handleMouseUp(event) {
        this.mouse.down = false;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw pixel data of all the tiles on a temporary canvas
        const imageData = new ImageData(this.displayGrid, this.GRID_WIDTH, this.GRID_HEIGHT);
        this.renderCtx.clearRect(0, 0, this.GRID_WIDTH, this.GRID_HEIGHT);
        this.renderCtx.putImageData(imageData, 0, 0);

        this.ctx.save();
        this.ctx.scale(this.TILE_SIZE, this.TILE_SIZE);
        this.ctx.drawImage(this.renderCanvas, 0, 0);
        this.ctx.restore();
        
        // Grid lines
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {

                if (this.showGrid) {
                    this.lineWidth = 2;
                    this.ctx.strokeRect(x * this.TILE_SIZE, y * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);
                }

                // Entropy text
                if (this.showEntropy) {
                    this.ctx.fillStyle = 'black';
                    this.ctx.fillText(this.entropy[y * this.GRID_WIDTH + x].toString(), x * this.TILE_SIZE + this.HALF_TILE_SIZE, y * this.TILE_SIZE + this.HALF_TILE_SIZE);
                }
            }
        }
    }

    updateEntropy(tilePosition, tileIndex) {

        const gridSize = this.GRID_WIDTH * this.GRID_HEIGHT;
        const originalX = tilePosition % this.GRID_WIDTH;
        const bitsetSize = this.adjacenciesManager.bitsetSize;

        this.DIRECTION4.forEach((direction, index) => {
            const newPosition = tilePosition + direction;
            if (!inBounds(newPosition, originalX, this.GRID_WIDTH, gridSize)) return;

            const tile = this.grid[newPosition];

            if (tile.collapsed) return;

            // Decode options data
            const tileOffset = tileIndex * 4 * bitsetSize;
            const directionOffet = index * bitsetSize;
            const startIndex = tileOffset + directionOffet;
            const endIndex = startIndex + bitsetSize;
            const newOptions = this.adjacenciesManager.allAdjacencyData.subarray(startIndex, endIndex);
            applyBitsetContraints(tile.options, newOptions);

            // Update display entropy
            this.entropy[newPosition] = this.cellManager.calculateEntropy(tile);

            // Update average pixel value
            const averageColor = this.cellManager.getWeightedAverageColor(tile.options);

            // Add the pixel to the main grid
            this.displayGrid[newPosition * 4] = averageColor[0];
            this.displayGrid[newPosition * 4 + 1] = averageColor[1];
            this.displayGrid[newPosition * 4 + 2] = averageColor[2];
            this.displayGrid[newPosition * 4 + 3] = 255; // Always opaque
        });
    }

    propagateEntropyFrom(startPosition) {
        const gridWidth = this.GRID_WIDTH;
        const gridSize = gridWidth * this.GRID_HEIGHT;
        const bitsetSize = this.adjacenciesManager.bitsetSize;
        const adjacenciesData = this.adjacenciesManager.allAdjacencyData;

        const queue = [startPosition];

        // Reused, bitset of the combined tile options which restricts the next tile
        const combinedBitset = new Uint32Array(bitsetSize); 

        while (queue.length) {
            const currentPosition = queue.pop();
            const currentTile = this.grid[currentPosition];
            const currentX = currentPosition % gridWidth;

            this.DIRECTION4.forEach((direction, directionIndex) => {
                const neighbourPosition = currentPosition + direction;
                if (!inBounds(neighbourPosition, currentX, gridWidth, gridSize)) return;

                const neighbourTile = this.grid[neighbourPosition];
                if (neighbourTile.collapsed) return;

                // Clear the bitset (as its reused)
                combinedBitset.fill(0);

                // Make the combined bitset for the neighbour based on current tiles options
                forEachSetBit(currentTile.options, (optionTileIndex) => {

                    // Find the connection data index in the big precomputed array
                    const adjacencyIndex = optionTileIndex * 4 * bitsetSize + directionIndex * bitsetSize;

                    // Loop through the words in this options bitset and combine (Bitwise OR) with the combined bitset
                    for (let i = 0; i < bitsetSize; i++) {
                        combinedBitset[i] |= adjacenciesData[adjacencyIndex + i];
                    }
                });

                // Apply the combinedBitset contraint onto the neighbours bitset
                const hasBitsetChanged = applyBitsetContraints(neighbourTile.options, combinedBitset);
                if (hasBitsetChanged) {

                    if (isBitsetEmpty(neighbourTile.options)) {
                        console.warn("Contradiction at", neighbourPosition);
                        return false;
                    }

                    // Update entropy at this tile and the display
                    this.entropy[neighbourPosition] = this.cellManager.calculateEntropy(neighbourTile);
                    const averageColor = this.cellManager.getWeightedAverageColor(neighbourTile.options);
                    const displayIndex = neighbourPosition * 4;
                    this.displayGrid[displayIndex] = averageColor[0];
                    this.displayGrid[displayIndex + 1] = averageColor[1];
                    this.displayGrid[displayIndex + 2] = averageColor[2];
                    this.displayGrid[displayIndex + 3] = 255; // Always opaque

                    queue.push(neighbourPosition);
                }
            });
        }

        return true;
    }

    step() {
        // Get random tile with minimum entropy
        const minimumIndex = getRandomMinimumElement(this.entropy);

        if (minimumIndex == undefined) {
            this.complete = true;
            return;
        }

        const tile = this.grid[minimumIndex];

        // Select weighted random tile
        const selectedTileIndex = this.cellManager.getWeightedRandomTile(tile.options);

        // Add the pixel to the main grid
        this.displayGrid[minimumIndex * 4] = this.tileManager.tileCentres[selectedTileIndex * 4];
        this.displayGrid[minimumIndex * 4 + 1] = this.tileManager.tileCentres[selectedTileIndex * 4 + 1];
        this.displayGrid[minimumIndex * 4 + 2] = this.tileManager.tileCentres[selectedTileIndex * 4 + 2];
        this.displayGrid[minimumIndex * 4 + 3] = 255; // Always opaque

        // Collapse tile
        const bitsetSize = this.adjacenciesManager.bitsetSize;
        tile.options = makeSingletonBitset(bitsetSize, selectedTileIndex); // First propagation only has 1 avaliable option
        // tile.options = null;
        tile.collapsed = true;
        this.entropy[minimumIndex] = 0;

        // Propagate entropy of surrounding tiles
        // this.updateEntropy(minimumIndex, selectedTileIndex);
        const noContradiction = this.propagateEntropyFrom(minimumIndex);
        if (!noContradiction) {
            // Backtrack
            this.complete = true;
        }
    }

    setupGrid() {
        // Create arrays
        this.grid = this.cellManager.generateGrid(this.GRID_WIDTH * this.GRID_HEIGHT);
        this.displayGrid = new Uint8ClampedArray(this.GRID_WIDTH * this.GRID_HEIGHT * 4); // RGBA
        this.entropy.fill(this.tileManager.uniqueTiles);

        // Fill displayGrid with average color of possible tiles
        const averageColorAllTiles = this.cellManager.getWeightedAverageColor(this.grid[0].options);

        for (let i = 0; i < this.displayGrid.length; i++) {
            this.displayGrid[i * 4] = averageColorAllTiles[0];
            this.displayGrid[i * 4 + 1] = averageColorAllTiles[1];
            this.displayGrid[i * 4 + 2] = averageColorAllTiles[2];
            this.displayGrid[i * 4 + 3] = 255; // Always opaque
        }
    }

    play() {
        if (this.complete) {
            this.pause();
            return;
        }
        this.step();
        this.render();
    }

    pause() {
        playButton.textContent = 'Play';
        this.playing = false;
        clearInterval(this.PLAY_INTERVAL_ID);
    }

    reset() {
        this.BOUNDING_BOX = this.canvas.getBoundingClientRect();
        this.pause();
        this.setupGrid();
        this.complete = false;
    }

    run() {
        // Give cellManager some variables that weren't avaliable at the start
        this.cellManager.totalTiles = this.tileManager.image.width * this.tileManager.image.height;
        this.cellManager.uniqueTiles = this.tileManager.uniqueTiles;
        this.cellManager.bitsetSize = this.adjacenciesManager.bitsetSize;
        this.cellManager.unusedBits = this.adjacenciesManager.unusedBits;
        this.cellManager.indexToFrequency = this.tileManager.indexToFrequency;

        console.log(this.adjacenciesManager.allAdjacencyData);

        this.setupGrid();
        this.render();
    }
}

let main = new Main();
main.tileManager.mainRunFunction = main.run.bind(main);
main.tileManager.loadImage('Flowers');

// ---------- UI ------------

stepButton.onclick = () => {
    if (main.complete) return;
    main.step();
    main.render();
}

resetButton.onclick = () => {
    main.reset();
    main.render();
}

playButton.onclick = () => {
    if (main.complete) return;
    main.playing = !main.playing;
    if (main.playing) {
        playButton.textContent = 'Pause';
        main.PLAY_INTERVAL_ID = setInterval(() => {
            main.play();
        }, main.PLAY_SPEED);
    } else {
        main.pause();
    }
}

entropyButton.onclick = () => {
    main.showEntropy = !main.showEntropy;
    entropyButton.textContent = (main.showEntropy) ? "Show entropy: ON" : "Show entropy: OFF";
    main.render();
}

gridButton.onclick = () => {
    main.showGrid = !main.showGrid;
    gridButton.textContent = (main.showGrid) ? "Show grid: ON" : "Show grid: OFF";
    main.render();
}

// ------------- DROPDOWNS -------------
const dropdowns = document.querySelectorAll('.dropdown');
const dropbuttons = document.querySelectorAll('.dropbtn');

// Dropdown's visability toggles when clicked
dropbuttons.forEach((button, index) => {
    button.onclick = function() {
        dropdowns[index].classList.toggle('show');
    }
});

// Close the dropdown if the user clicks outside of it
window.addEventListener('click', function(event) {
    dropdowns.forEach((dropdown) => {
        if (!dropdown.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    });
});

const images = document.getElementById("images");
const imageButtons = images.children;
for (let i = 0; i < imageButtons.length; i++) {
    const btn = imageButtons[i];
    btn.onclick = () => {
        if (btn.textContent == dropbuttons[0].textContent) return;
        dropbuttons[0].textContent = btn.textContent;
        dropdowns[0].classList.remove('show');

        clearInterval(main.PLAY_INTERVAL_ID);
        playButton.textContent = "Play";

        // Save options
        const options = {entropy: main.showEntropy, grid: main.showGrid};

        main = new Main();
        main.tileManager.mainRunFunction = main.run.bind(main);
        main.tileManager.loadImage(btn.textContent);

        // Load options
        main.showEntropy = options.entropy;
        main.showGrid = options.grid;
    }
}