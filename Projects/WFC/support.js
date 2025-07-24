export function get_random_int_in_range(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

export function load_assets(func) {
    const images = [];
    let loaded_images = 0;

    for (let i = 0; i < 5; i++) {
        const img = new Image();
        img.src = `./assets/${i}.png`;

        img.onload = function() {
            images[i] = img;
            loaded_images++;

            if (loaded_images == 5) {
                // Start program when images have loaded
                func(images);
            }
        };

        img.onerror = function() {
            console.error(`Failed to load image: ${i}.png`);
        };
    }
}
