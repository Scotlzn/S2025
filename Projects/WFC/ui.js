export default class UIManager {
    constructor(main) {
        this.main = main;

        this.play_button = document.getElementById("play_button");
        this.step_button = document.getElementById("step_button");
        this.clear_button = document.getElementById("clear_button");
        this.complete_button = document.getElementById("complete_button");
        this.entropy_button = document.getElementById("entropy_button");
        this.back_button = document.getElementById("back_button");
        this.backtracking_button = document.getElementById("backtracking_button");

        // Using () => {} because "this." doesnt work otherwise
        this.step_button.onclick = () => {
            main.step();
            main.render();
        }

        this.clear_button.onclick = () => {
            main.clear();
            main.render();
        }

        this.back_button.onclick = () => {
            if (main.backtracking_manager.active) return;
            main.backtracking_manager.back();
            main.render();
        }

        this.complete_button.onclick = () => {
            if (main.steps > 10000) return;
            main.complete_grid();
        }

        this.entropy_button.onclick = () => {
            main.show_entropy = !main.show_entropy;
            this.entropy_button.textContent = (main.show_entropy) ? 'Show entropy: \nON' : 'Show entropy: \nOFF';
            main.render();
        }

        this.backtracking_button.onclick = () => {
            main.backtracking_manager.mode = (main.backtracking_manager.mode + 1) % main.backtracking_manager.BACKTRACKING_MODES.length;
            this.backtracking_button.textContent = main.backtracking_manager.BACKTRACKING_MODES[main.backtracking_manager.mode];
            if (main.error_found && main.backtracking_manager.mode != 0) main.backtracking_manager.active = true;
        }

        this.play_button.onclick = () => {
            if (main.complete && !main.backtracking_manager.active) return;
            main.playing = !main.playing;
            if (main.playing) {
                const speed = parseInt(document.getElementById("speed_input").value, 10);
                this.play_button.textContent = 'Pause';
                main.intervalId = this.main.intervalId = setInterval(() => {
                    this.main.play(); 
                }, speed);
            } else main.pause();
        }
    }
}