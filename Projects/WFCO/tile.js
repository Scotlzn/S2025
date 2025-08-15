import AdjacenciesManager from "./adjacencies.js";

export default class TileManager {
    constructor() {
        this.source_canvas = document.getElementById("canvas2");
        this.source_ctx = this.source_canvas.getContext('2d');
        this.tile_canvas = document.getElementById("canvas3");
        this.tile_ctx = this.tile_canvas.getContext('2d');

        this.tile_text = document.getElementById("tiles_generated")
        this.source_text = document.getElementById("source_size");

        this.TILE_SIZE = 3; // Has to be odd
        this.color_data = [];
        this.colors = {};

        this.uniqueTiles = 0;
        this.frequencies = new Map();

        // Both non-duplicate maps
        this.indexToTile = new Map();
        this.tileToIndex = new Map();

        this.displayTiles; // Uint32Array of indices only 
        this.tileCentres; // Uint32Array of duplicate single pixels

        this.mainRunFunction;
        this.image;
    }

    generateTile(topleftX, topleftY, imageWidth, imageHeight) {
        // Each pixel is the top-left of its own tile
        let tile = new Uint8ClampedArray(4 * this.TILE_SIZE * this.TILE_SIZE);
        for (let tileY = 0; tileY < this.TILE_SIZE; tileY++) {
            for (let tileX = 0; tileX < this.TILE_SIZE; tileX++) {
                // Get pixel data from source image -> color index has to overlap
                const overlappedX = (topleftX + tileX) % imageWidth;
                const overlappedY = (topleftY + tileY) % imageHeight;

                const colorIndex = (overlappedY * this.image.width + overlappedX) * 4;
                const red = this.color_data[colorIndex];
                const green = this.color_data[colorIndex + 1];
                const blue = this.color_data[colorIndex + 2]; 

                // Add pixel to the current tile buffer
                const tileIndex = (tileY * this.TILE_SIZE + tileX) * 4;
                tile[tileIndex] = red;
                tile[tileIndex + 1] = green;
                tile[tileIndex + 2] = blue;
                tile[tileIndex + 3] = 255; // Always opaque
            }
        }
        // Tile frequency
        const tile_key = Array.from(tile).join(',');
        const isUnique = this.frequencies.get(tile_key);
        this.frequencies.set(tile_key, (isUnique ?? 0) + 1);

        if (isUnique == undefined) {
            this.indexToTile.set(this.indexToTile.size, tile);
            this.tileToIndex.set(tile_key, this.tileToIndex.size);
        }

        // Add to indicies for rendering
        const displayIndex = (topleftY * imageWidth) + topleftX;
        this.displayTiles[displayIndex] = this.tileToIndex.get(tile_key);
    }
    
    generateTiles() {
        const imageWidth = this.image.width, imageHeight = this.image.height;

        // Create a temporary canvas to draw the image on
        const temp_canvas = document.createElement("canvas");
        const temp_ctx = temp_canvas.getContext('2d');
        temp_canvas.width = this.image.width;
        temp_canvas.height = this.image.height;
        temp_ctx.drawImage(this.image, 0, 0);

        // Extract pixel data from the image
        const imageData = temp_ctx.getImageData(0, 0, temp_canvas.width, temp_canvas.height);
        this.color_data = imageData.data; // returns Uint8ClampedArray [r, g, b, a, r, g, b, a, ...]

        // Calculate size of complete tile buffer (in bytes)
        const totalTiles = this.image.width * this.image.height;
        const byteTileSize = this.TILE_SIZE * this.TILE_SIZE * 4; // 4 bytes (r,g,b,a)
        this.tileCentres = new Uint8ClampedArray(totalTiles * 4); // 4 bytes (r,g,b,a)

        // Loop through each pixel to find all the colors in the source image
        this.colors = {};
        for (let y = 0; y < temp_canvas.height; y++) {
            for (let x = 0; x < temp_canvas.width; x++) {
                const i = (y * temp_canvas.width + x) * 4;
                const r = this.color_data[i];
                const g = this.color_data[i + 1];
                const b = this.color_data[i + 2];
                const key = `${r},${g},${b}`;

                if (!(key in this.colors)) {
                    this.colors[key] = Object.keys(this.colors).length;
                }
            }
        }

        // Loop through each pixel to generate the tiles
        this.displayTiles = new Uint32Array(totalTiles);
        for (let y = 0; y < temp_canvas.height; y++) {
            for (let x = 0; x < temp_canvas.width; x++) {

                // Generate tile data using this pixel as the top-left
                this.generateTile(x, y, imageWidth, imageHeight);

                // Find position of the tile's centre pixel (with overlapping)
                const centreX = (x + Math.floor(this.TILE_SIZE * 0.5)) % imageWidth;
                const centreY = (y + Math.floor(this.TILE_SIZE * 0.5)) % imageHeight;

                // Add centre pixel to main tile buffer for main rendering
                const tileCentreIndex = (y * imageWidth + x) * 4;
                const colorCentreIndex = (centreY * imageWidth + centreX) * 4;
                this.tileCentres[tileCentreIndex] = this.color_data[colorCentreIndex];
                this.tileCentres[tileCentreIndex + 1] = this.color_data[colorCentreIndex + 1];
                this.tileCentres[tileCentreIndex + 2] = this.color_data[colorCentreIndex + 2];
                this.tileCentres[tileCentreIndex + 3] = 255; // Always opaque
            }
        }
        this.uniqueTiles = this.frequencies.size;

        console.log(this.tileCentres);

        // Created here so I can access all the arrays here
        const adjacenciesManager = new AdjacenciesManager(this);
        adjacenciesManager.precompute();
        console.log(adjacenciesManager.allAdjacencyData);

        this.setupTilesImage(byteTileSize);
        this.mainRunFunction();
    }

    setupTilesImage() {
        // Account for non-square images and scale
        const aspectRatio = this.image.width / this.image.height;
        if (aspectRatio >= 1) { // Wide image
            this.tile_canvas.width = Math.round(this.tile_canvas.height * aspectRatio);
        } else { // Tall image
            this.tile_canvas.height = Math.round(this.tile_canvas.width / aspectRatio);
        }

        // Resize canvas to prevent visual artifacts
        const numberTilesX = this.image.width;
        const numberTilesY = this.image.height;
        const tileSize = this.tile_canvas.width / numberTilesX;
        const perfectX = Math.round(this.tile_canvas.width / tileSize) * tileSize;
        const perfectY = Math.round(this.tile_canvas.height / tileSize) * tileSize;
        this.tile_canvas.width = perfectX;
        this.tile_canvas.height = perfectY;
        this.tile_text.textContent += ` ${numberTilesX * numberTilesY} (${this.uniqueTiles})`;

        // Make a temporary canvas to paste the pixel data onto
        const temp_canvas = document.createElement("canvas");
        const temp_ctx = temp_canvas.getContext('2d');
        temp_canvas.width = numberTilesX * this.TILE_SIZE;
        temp_canvas.height = numberTilesY * this.TILE_SIZE;
        
        // Draw pixel data of each tile onto the temporary canvas
        for (let y = 0; y < numberTilesY; y++) {
            for (let x = 0; x < numberTilesX; x++) {
                const index = this.displayTiles[y * numberTilesX + x];
                const tileData = this.indexToTile.get(index);
                const imageData = new ImageData(tileData, this.TILE_SIZE, this.TILE_SIZE);
                temp_ctx.putImageData(imageData, x * this.TILE_SIZE, y * this.TILE_SIZE)
            }
        }

        // Scale up temporary canvas and draw it onto the main tile canvas
        const scale = tileSize / this.TILE_SIZE;
        this.tile_ctx.save();
        this.tile_ctx.scale(scale, scale);
        this.tile_ctx.imageSmoothingEnabled = false;
        this.tile_ctx.drawImage(temp_canvas, 0, 0);
        this.tile_ctx.restore();

        // Draw grid lines on main tile canvas
        this.tile_ctx.scale(1, 1);
        this.tile_ctx.strokeStyle = 'black';
        this.tile_ctx.lineWidth = 1;
        for (let y = 0; y < numberTilesY; y++) {
            for (let x = 0; x < numberTilesX; x++) {
                this.tile_ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }
    }

    setupSourceImage() {
        this.source_text.textContent += ` ${this.image.width}x${this.image.height}`;
        // Account for non-square images and scale accordingly
        const aspectRatio = this.image.width / this.image.height;
        if (aspectRatio >= 1) {     // Wide image
            this.source_canvas.width = Math.round(this.source_canvas.height * aspectRatio);
        } else {    // Tall image
            this.source_canvas.height = Math.round(this.source_canvas.width / aspectRatio);
        }

        const perfectWidth = Math.round(this.source_canvas.width / this.image.width) * this.image.width;
        const perfectHeight = Math.round(this.source_canvas.height / this.image.height) * this.image.height;
        this.source_canvas.width = perfectWidth;
        this.source_canvas.height = perfectHeight;

        const scaleX = this.source_canvas.width / this.image.width;
        const scaleY = this.source_canvas.height / this.image.height;
        this.source_ctx.scale(scaleX, scaleY);
        this.source_ctx.imageSmoothingEnabled = false;
        this.source_ctx.drawImage(this.image, 0, 0);
    }
    
    loadImage() {
        const img = new Image();
        img.src = './assets/Flowers.png';
        img.onload = () => {
            this.image = img;
            this.setupSourceImage();
            this.generateTiles();
        };
    }
}