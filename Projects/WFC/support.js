import Tile from "./tile.js";

export function get_random_int_in_range(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function create_array_2D(size, number_of_tiles) {
    let output = [];
    for (let x = 0; x < size; x++) {
        let new_line = [];
        for (let y = 0; y < size; y++) {
            new_line.push(new Tile([x, y], number_of_tiles));
        }
        output.push(new_line);
    }
    return output;
}

function create_rotated_image(original_img, angle) {
    // Angle in radians btw
    let temp_canvas = document.createElement('canvas');
    let ctx = temp_canvas.getContext('2d');

    let size = original_img.width;
    temp_canvas.width = size;
    temp_canvas.height = size;

    // Move to center, rotate, draw
    ctx.translate(size * 0.5, size * 0.5);
    ctx.rotate(angle);
    ctx.drawImage(original_img, -size * 0.5, -size * 0.5);

    // Create image from canvas
    const rotated_img = new Image();
    rotated_img.src = temp_canvas.toDataURL();

    return rotated_img;
}

export function load_assets(main) {
    const tiles = 2;
    const rotation_offset = 1; // The index/tile where rotated images start
    const total_images = rotation_offset + ((tiles - rotation_offset) * 4)

    let images = [];
    let loaded_images = 0;

    for (let i = 0; i < tiles; i++) {

        // See if image has to be rotated and load
        const repitions = (i >= rotation_offset) ? 4 : 1;
        const img = new Image();
        img.src = `./assets/pipes/${i}.png`;
        img.onload = () => {

        for (let j = 0; j < repitions; j++) {

            // Rotate clockwise from 0 rads (straight up)
            let rotated_img = create_rotated_image(img, Math.PI * (j * 0.5));

            rotated_img.onload = function() {
                // Maintain order of tiles and rotated tiles
                const index = (i < rotation_offset) ? i : rotation_offset + (i - rotation_offset) * 4 + j;
                images[index] = rotated_img;
                loaded_images++;

                // ONLY start program when ALL images have loaded
                if (loaded_images == total_images) {
                    main.run(images);
                }
            };

            rotated_img.onerror = function() {
                let angle = (Math.PI * (j * 0.5)) * (180 / Math.PI);
                console.error(`Image: ${i}, Rotation: ${angle} degrees, failed to load!`);
            };
        }

        }
    }
}
