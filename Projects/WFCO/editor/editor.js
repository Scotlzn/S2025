import Pixel from "./pixel.js";

function createArray1D(w, h) {
    const output = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            output[y * w + x] = new Pixel();
        }
    }
    return output;
}

function hexToRgb(hex) {
    hex = hex.replace(/^#/, ''); // Remove leading #

    // Handle shorthand form (#fff)
    // if (hex.length === 3) {
    //     hex = hex.split('').map(c => c + c).join('');
    // }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
}

class Editor {
    constructor() {
        this.canvas = document.getElementById("imageEditor");
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

        this.showGrid = true;
        this.maintainRatio = true;

        this.selectedColor = '#000000';
        this.grid = createArray1D(this.GRID_WIDTH, this.GRID_HEIGHT);

        this.update = this.update.bind(this);
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

    placeTile() {
        const pixelClicked = this.grid[this.mouse.tileY * this.GRID_WIDTH + this.mouse.tileX];

        if (pixelClicked.color == this.selectedColor) return;

        pixelClicked.color = this.selectedColor;

        this.render();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Grid lines
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {



                const pixel = this.grid[y * this.GRID_WIDTH + x];
                if (pixel.color != null) {
                    this.ctx.fillStyle = pixel.color;
                    this.ctx.fillRect(x * this.TILE_SIZE, y * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);
                } else {
                    // Background
                    this.ctx.fillStyle = (x + y) % 2 === 0 ? "#ddd" : "#bbb";
                    this.ctx.fillRect(x * this.TILE_SIZE, y * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);
                }

                if (this.showGrid) {
                    this.lineWidth = 2;
                    this.ctx.strokeRect(x * this.TILE_SIZE, y * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);
                }
            }
        }
    }

    update() {
        if (this.mouse.down) {
            this.placeTile();
        }
        requestAnimationFrame(this.update);
    }

    clear() {
        this.grid = createArray1D(this.GRID_WIDTH, this.GRID_HEIGHT);
    }

    run() {
        this.render();
        requestAnimationFrame(this.update);
    }
}

const editor = new Editor();
editor.run();

// Draw options
const drawButtons = Array.from(document.getElementsByClassName("clickable"));

function clearButtons() {
    for (const btn of drawButtons) {
        btn.style.backgroundColor = '#333';
        btn.style.color = 'white';
    }
}

for (const button of drawButtons) {
    button.onclick = () => {
        // Clear selection off all buttons
        clearButtons();

        button.style.backgroundColor = '#ddd';
        button.style.color = 'black';
    }
}

const clearButton = document.getElementById("clearButton");
clearButton.onclick = () => {
    editor.clear();
    editor.render();
}

const exportButton = document.getElementById("exportButton");
exportButton.onclick = () => {
    const imageSize = editor.GRID_WIDTH * editor.GRID_HEIGHT;
    const exportedImage = new Uint8ClampedArray(imageSize * 4); // RGBA

    // Translate grid into a pixel array
    for (let tile = 0; tile < imageSize; tile++) {

        let color = editor.grid[tile].color;

        if (color == null) color = "#FFFFFF"; // Background color

        const rgbColor = hexToRgb(color);
        exportedImage[tile * 4] = rgbColor.r;
        exportedImage[tile * 4 + 1] = rgbColor.g;
        exportedImage[tile * 4 + 2] = rgbColor.b;
        exportedImage[tile * 4 + 3] = 255; // Always opaque
    }

    // Store as JSON
    localStorage.setItem("imageExport", JSON.stringify(Array.from(exportedImage)));
}

// Grid options
const widthInput = document.getElementById("widthInput");
const heightInput = document.getElementById("heightInput");
const minimumSize = 3, maximumSize = 50;

function changeInput(value, isWidth) {
    editor.canvas.width = 800;
    editor.canvas.height = 800;
    
    if (!editor.maintainRatio) {
        const aspectRatio = editor.GRID_WIDTH / editor.GRID_HEIGHT;
        if (aspectRatio >= 1) {     // Wide image
            editor.canvas.width = Math.round(editor.canvas.height * aspectRatio);
        } else {    // Tall image
            editor.canvas.height = Math.round(editor.canvas.width / aspectRatio);
        }

    } else {
        editor.GRID_WIDTH = value;
        editor.GRID_HEIGHT = value;
        if (isWidth) {
            heightInput.value = value;
        } else widthInput.value = value;
    }

    editor.TILE_SIZE = editor.canvas.width / editor.GRID_WIDTH;
    editor.HALF_TILE_SIZE = editor.TILE_SIZE * 0.5;
    
    // Prevent sub-pixel values
    editor.PERFECT_W = Math.round(editor.canvas.width / editor.TILE_SIZE) * editor.TILE_SIZE;
    editor.PERFECT_H = Math.round(editor.canvas.height / editor.TILE_SIZE) * editor.TILE_SIZE;
    editor.canvas.width = editor.PERFECT_W;
    editor.canvas.height = editor.PERFECT_H;
    editor.BOUNDING_BOX = editor.canvas.getBoundingClientRect();

    editor.clear();
    editor.render();
}

widthInput.addEventListener('input', () => {
    let value = parseInt(widthInput.value, 10);
    if (isNaN(value)) return;
    value = Math.max(minimumSize, value);
    value = Math.min(maximumSize, value);
    editor.GRID_WIDTH = value;
    changeInput(value, true);
});

heightInput.addEventListener('input', () => {
    let value = parseInt(heightInput.value, 10);
    if (isNaN(value)) return;
    value = Math.max(minimumSize, value);
    value = Math.min(maximumSize, value);
    editor.GRID_HEIGHT = value;
    changeInput(value, false);
});

// --------- Color selection ----------
const addColorInput = document.getElementById("addColorInput");
const addColorButton = document.getElementById("addColorButton");
const clearColorButton = document.getElementById("clearColorButton");
const colorDiv = document.getElementById("colorDiv");

function colorClicked(button) {
    const color = button.dataset.color;
    console.log(`Selected color ${color}!`);
    editor.selectedColor = color;
}

// Color buttons
for (const button of Array.from(colorDiv.children)) {
    button.addEventListener('click', () => {
        colorClicked(button);
    });
}

// Add color
addColorButton.onclick = () => {
    const color = addColorInput.value;

    // Can't add same color twice
    const existingColors = Array.from(colorDiv.children).map(color => color.dataset.color);
    if (existingColors.includes(color)) {
        return;
    }

    const colorElement = document.createElement('div');
    colorElement.classList.add("color");
    colorElement.style.background = color;
    colorElement.dataset.color = color;
    colorElement.addEventListener('click', () => {
        colorClicked(colorElement);
    });
    colorDiv.appendChild(colorElement);
}

// Clear colors
clearColorButton.onclick = () => {
    for (let colorIndex = colorDiv.children.length - 1; colorIndex >= 2; colorIndex--) {
        const color = colorDiv.children[colorIndex];
        colorDiv.removeChild(color);
    }
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

// Options
const ratioButton = document.getElementById("ratioButton");
ratioButton.onclick = () => {
    editor.maintainRatio = !editor.maintainRatio;
    ratioButton.textContent = (editor.maintainRatio) ? "Maintain ratio" : "Ignore ratio";
}