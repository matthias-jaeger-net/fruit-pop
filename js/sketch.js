let cols = 9;
let rows = 16;
let boxSize = 40;
let spacing = 0;
let colors = ["#F44336", "#00BCD4", "#CDDC39"];
let fruits = ["apple", "grape", "banana"];

let grid = [];
let score = 0;
let waitingToCollapse = false;

let shakeDuration = 0;
let shakeMagnitude = 10;

let record = 0;

let images = {};

function preload() {
    images.apple = loadImage("images/apple.png");
    //images.orange = loadImage("images/orange.png");
    images.grape = loadImage("images/grape.png");
    images.banana = loadImage("images/banana.png");

    sound1 = loadSound("sounds/ui-pop-sound-316482.mp3");
    sound2 = loadSound("sounds/success-1-6297(1).mp3");
    sound3 = loadSound("sounds/fast-whoosh-118248.mp3");
    sound3.amp(0.12);
}

function setup() {
    randomSeed(1);
    createCanvas(9 * 80, 16 * 80);
    rectMode(CENTER);

    boxSize = width / cols;

    for (let x = 0; x < cols; x++) {
        grid[x] = [];
        for (let y = 0; y < rows; y++) {
            grid[x][y] = createBox(y);
        }
    }
}

function createBox(y) {
    let fruitType = random(fruits);
    return {
        exists: true,
        targetY: y,
        animY: y,
        collapsing: false,
        size: boxSize,
        fruit: fruitType,
    };
}

function draw() {
    background("#111");
    translate(width / 2, height / 2);

    let offsetX = -(cols * (boxSize + spacing)) / 2 + (boxSize + spacing) / 2;
    let offsetY = -(rows * (boxSize + spacing)) / 2 + (boxSize + spacing) / 2;

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            let b = grid[x][y];
            if (b.exists || b.collapsing) {
                push();
                let drawY = lerp(b.animY, b.targetY, 0.2);
                b.animY = drawY;
                translate(
                    offsetX + x * (boxSize + spacing),
                    offsetY + drawY * (boxSize + spacing),
                    0
                );
                // fill(b.color);

                let mx = mouseX - width / 2;
                let my = mouseY - height / 2;

                let boxLeft = offsetX + x * (boxSize + spacing) - boxSize / 2;
                let boxRight = boxLeft + boxSize;
                let boxTop =
                    offsetY + drawY * (boxSize + spacing) - boxSize / 2;
                let boxBottom = boxTop + boxSize;

                if (
                    mx > boxLeft &&
                    mx < boxRight &&
                    my > boxTop &&
                    my < boxBottom
                ) {
                    stroke("#FFF");
                    strokeWeight(2);
                } else {
                    noStroke();
                }

                if (images[b.fruit]) {
                    imageMode(CENTER);
                    image(images[b.fruit], 0, 0, b.size, b.size);
                }

                // rect(0, 0, b.size, b.size, b.size);
                pop();
            }
        }
    }

    if (shakeDuration > 0) {
        let dx = random(-shakeMagnitude, shakeMagnitude);
        let dy = random(-shakeMagnitude, shakeMagnitude);
        translate(dx, dy);
        shakeDuration--;
    }

    animateBoxes();
}

function triggerShake() {
    let container = document.getElementById("gameContainer");
    container.classList.add("shake");
    setTimeout(() => container.classList.remove("shake"), 400); // match animation duration
}

function triggerFlash() {
    let container = document.getElementById("score");
    container.classList.add("flash");
    setTimeout(() => container.classList.remove("flash"), 400); // match animation duration
}

function animateBoxes() {
    let anyCollapsing = false;

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            let b = grid[x][y];

            if (b.collapsing) {
                b.size *= 0.8;
                if (b.size < 1) {
                    b.exists = false;
                    b.collapsing = false;
                    b.size = boxSize;
                } else {
                    anyCollapsing = true;
                }
            }
        }
    }

    // if nobody is collapsing anymore, and we were waiting -> apply gravity
    if (!anyCollapsing && waitingToCollapse) {
        waitingToCollapse = false;
        applyGravity();
    }
}

function touchStarted() {
    mousePressed(); // reuse the logic
    return false; // prevent default scrolling behavior
}

function mousePressed() {
    let offsetX = -(cols * (boxSize + spacing)) / 2 + (boxSize + spacing) / 2;
    let offsetY = -(rows * (boxSize + spacing)) / 2 + (boxSize + spacing) / 2;

    let mx = mouseX - width / 2;
    let my = mouseY - height / 2;

    let guessedX = floor(
        (mx - offsetX + (boxSize + spacing) / 2) / (boxSize + spacing)
    );
    let guessedY = floor(
        (my - offsetY + (boxSize + spacing) / 2) / (boxSize + spacing)
    );

    if (guessedX >= 0 && guessedX < cols && guessedY >= 0 && guessedY < rows) {
        let b = grid[guessedX][guessedY];
        if (b.exists && !b.collapsing) {
            let group = findConnected(guessedX, guessedY, b.fruit);
            if (group.length > 1) {
                for (let cell of group) {
                    grid[cell.x][cell.y].collapsing = true;
                }

                // Score and feedbacks here
                score += group.length;
                select("#score").html(score);
                sound1.play();
                sound3.play();

                // Shake on every 1000 points
                if (score % 1000 === 0 && score > 0) {
                    shakeDuration = 20;
                    triggerShake();
                }

                if (score % 10 === 0) {
                    triggerFlash();
                }

                // Check record
                if (group.length > record) {
                    record = group.length;
                    select("#record").html(record + " / " + cols * rows);
                    sound2.play();
                    sound3.play();
                    triggerShake();
                }

                waitingToCollapse = true;
            }
        }
    }
}

function findConnected(x, y, targetColor, visited = {}) {
    let key = x + "," + y;
    if (visited[key]) return [];

    let list = [];
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
        let b = grid[x][y];
        if (b.exists && b.fruit === targetColor) {
            visited[key] = true;
            list.push({ x, y });
            list = list.concat(findConnected(x + 1, y, targetColor, visited));
            list = list.concat(findConnected(x - 1, y, targetColor, visited));
            list = list.concat(findConnected(x, y + 1, targetColor, visited));
            list = list.concat(findConnected(x, y - 1, targetColor, visited));
        }
    }
    return list;
}

function applyGravity() {
    for (let x = 0; x < cols; x++) {
        let emptySpots = 0;
        for (let y = rows - 1; y >= 0; y--) {
            let b = grid[x][y];
            if (!b.exists) {
                emptySpots++;
            } else if (emptySpots > 0) {
                grid[x][y + emptySpots] = grid[x][y];
                grid[x][y + emptySpots].targetY = y + emptySpots;
                grid[x][y] = createEmptyBox();
            }
        }

        // Spawn new boxes at top
        for (let y = 0; y < emptySpots; y++) {
            grid[x][y] = createBox(y);
            grid[x][y].animY = y - emptySpots;
        }
    }
}

function createEmptyBox() {
    return {
        exists: false,
        targetY: 0,
        animY: 0,
        collapsing: false,
        size: boxSize,
        fruit: "",
    };
}
