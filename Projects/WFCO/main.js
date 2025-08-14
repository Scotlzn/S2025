import { } from "./support.js";
import TileManager from "./tile.js";

class Main {
    constructor() {
        this.canvas = document.getElementById("canvas");
        this.ctx = this.canvas.getContext('2d');

        this.GRID_WIDTH = 8, this.GRID_HEIGHT = 8;
        this.TILE_SIZE = this.canvas.width / this.GRID_WIDTH;
        this.HALF_TILE_SIZE = this.TILE_SIZE * 0.5;
        
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
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.font = `bold 20px sans-serif`;
        this.ctx.fillStyle = 'black';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.tileManager = new TileManager();
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
        for (let x = 0; x < this.GRID_WIDTH; x++) {
            for (let y = 0; y < this.GRID_HEIGHT; y++) {
                this.lineWidth = 2;
                this.ctx.strokeRect(x * this.TILE_SIZE, y * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);
            }
        }
    }

    run() {
        this.render();
    }
}

let main = new Main();
main.tileManager.mainRunFunction = main.run.bind(main);
main.tileManager.loadImage();