export default class TileManager {
    constructor() {
        this.source_canvas = document.getElementById("canvas2");
        this.source_ctx = this.source_canvas.getContext('2d');
        this.tile_canvas = document.getElementById("canvas3");
        this.tile_ctx = this.tile_canvas.getContext('2d');

        this.TILE_SIZE = 3;
        
        this.color_data = [];
        this.colors = {};
        this.displayTiles = [];

        this.mainRunFunction;
        this.image;
        this.tiles;
    }

    generateDisplayTile(topleftX, topleftY) {
        // Each pixel is the top-left of its own tile
        const imageWidth = this.image.width, imageHeight = this.image.height;
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
        return tile;
    }
    
    generateTiles() {      
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
        this.tiles = new Uint8ClampedArray(totalTiles * byteTileSize); 

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
        for (let y = 0; y < temp_canvas.height; y++) {
            for (let x = 0; x < temp_canvas.width; x++) {
                const tile = this.generateDisplayTile(x, y);
                const index = (y * temp_canvas.width) + x;
                const offset = index * byteTileSize;
                this.tiles.set(tile, offset);
            }
        }

        console.log(this.tiles);
        console.log(this.color_data);

        this.setupTilesImage(byteTileSize);
        this.mainRunFunction();
    }

    setupTilesImage(bytesPerTile) {
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

        // Make a temporary canvas to paste the pixel data onto
        const temp_canvas = document.createElement("canvas");
        const temp_ctx = temp_canvas.getContext('2d');
        temp_canvas.width = numberTilesX * this.TILE_SIZE;
        temp_canvas.height = numberTilesY * this.TILE_SIZE;

        // Draw pixel data of each tile onto the temporary canvas
        for (let y = 0; y < numberTilesY; y++) {
            for (let x = 0; x < numberTilesX; x++) {
                const index = (y * numberTilesX) + x;
                const offset = index * bytesPerTile;
                const tileData = this.tiles.subarray(offset, offset + bytesPerTile);
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
        // Account for non-square images and scale accordingly
        const aspectRatio = this.image.width / this.image.height;
        if (aspectRatio >= 1) {     // Wide image
            this.source_canvas.width = Math.round(this.source_canvas.height * aspectRatio);
        } else {    // Tall image
            this.source_canvas.height = Math.round(this.source_canvas.width / aspectRatio);
        }

        const perfectWidth= Math.round(this.source_canvas.width / this.image.width) * this.image.width;
        const perfectHeight= Math.round(this.source_canvas.height / this.image.height) * this.image.height;
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