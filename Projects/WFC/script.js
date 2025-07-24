import { load_assets, get_random_int_in_range } from "./support.js";

var canvas = document.getElementById("canvas1");
var ctx = canvas.getContext('2d');
var step_button = document.getElementById("step_button");
var entropy_button = document.getElementById("entropy_button");

const GRID_SIZE = 4;
const IMG_SIZE = 3; // In pixels

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const TILE_SIZE = WIDTH / GRID_SIZE;
const HALF_TILE_SIZE = TILE_SIZE * 0.5;
const SCALE = TILE_SIZE / IMG_SIZE;

var images = [];

var show_entropy = false;

ctx.imageSmoothingEnabled = false;
ctx.font = '40px "Press Start 2P"';
ctx.fillStyle = 'black';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Render tiles
    ctx.save();
    ctx.scale(SCALE, SCALE);
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            ctx.drawImage(images[get_random_int_in_range(0, 4)], x * IMG_SIZE, y * IMG_SIZE);
        }
    }
    ctx.restore();

    // Render text
    if (show_entropy) {
        ctx.save();
        ctx.scale(1, 1);
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                ctx.fillText(get_random_int_in_range(0, 5).toString(), x * TILE_SIZE + HALF_TILE_SIZE, y * TILE_SIZE + HALF_TILE_SIZE);
            }
        }
        ctx.restore();
    }
}

function run(image_data) {
    images = image_data;
    render();
}

// ------------ UI -------------
entropy_button.onclick = function() {
    show_entropy = !show_entropy;
    entropy_button.textContent = (show_entropy) ? 'Show entropy ON' : 'Show entropy OFF';
    render();
}

// ---- Page ONLOAD -----
load_assets(run);