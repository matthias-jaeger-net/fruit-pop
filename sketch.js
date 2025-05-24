let cols = 4;
let rows = 7;
let boxSize;
let spacing = 16;
let fruits = ["apple", "grape", "banana", "orange", "melon", "pear"];
let currentFruits = ["apple", "grape", "pear"];
let bombMode = false;
let bombCost = 5;

let canvas;

let grid = [];
let score = 0;
let waitingToCollapse = false;

let shakeDuration = 0;
let shakeMagnitude = 10;

let record = 0;

let achievements = {
    bestStreaks: {
        apple: 4,
        banana: 4,
        grape: 4,
        orange: 4,
    },
};

let achievedMessages = []; // for displaying pop-up reward messages

let images = {};

function startGame() {
    select("#splash-screen").addClass("hidden");
    select("#gameContainer").addClass("active");
}

function preload() {
    images.apple = loadImage("images/apple.png");
    images.orange = loadImage("images/orange.png");
    images.grape = loadImage("images/grape.png");
    images.banana = loadImage("images/banana.png");
    images.pear = loadImage("images/pear.png");
    images.melon = loadImage("images/melon.png");
    images.bomb = loadImage("images/bomb.png");

    sound1 = loadSound("sounds/ui-pop-sound-316482.mp3");
    sound2 = loadSound("sounds/success-1-6297(1).mp3");
    sound3 = loadSound("sounds/fast-whoosh-118248.mp3");
    sound3.amp(0.12);

    sound4 = loadSound("sounds/explosion-312361.mp3");

    sound5 = loadSound("sounds/error-126627.mp3");
}

function setup() {
    randomSeed(1);

    boxSize = 100;

    let canvasWidth = cols * boxSize + (cols - 1) * spacing;
    let canvasHeight = rows * boxSize + (rows - 1) * spacing;

    canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent("#gameContainer");

    for (let x = 0; x < cols; x++) {
        grid[x] = [];
        for (let y = 0; y < rows; y++) {
            grid[x][y] = createBox(y);
        }
    }
}

function draw() {
    background("#9FF7E4");
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

                let mx = mouseX - width / 2;
                let my = mouseY - height / 2;

                imageMode(CENTER);
                if (b.isBomb && images.bomb) {
                    image(images.bomb, 0, 0, b.size, b.size);
                } else if (images[b.fruit]) {
                    image(images[b.fruit], 0, 0, b.size, b.size);
                }

                // rect(0, 0, b.size, b.size, b.size);
                pop();
            }
        }
    }
    select("#bombs").html(score / bombCost);

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

function mousePressed() {
    if (
        document
            .getElementById("gameContainer")
            .classList.contains("active") === false
    ) {
        return;
    }
    handleInput(mouseX, mouseY);
}

function touchStarted() {
    if (
        document
            .getElementById("gameContainer")
            .classList.contains("active") === false
    ) {
        return; // Don't allow clicks if modal is visible
    }

    handleInput(touches[0].x, touches[0].y);
    return false;
}

function handleInput(mx, my) {
    let offsetX = -(cols * (boxSize + spacing)) / 2 + (boxSize + spacing) / 2;
    let offsetY = -(rows * (boxSize + spacing)) / 2 + (boxSize + spacing) / 2;

    mx -= width / 2;
    my -= height / 2;

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

                checkAchievements(group);
                score += group.length;
                select("#score").html(score);
                sound1.play();
                sound3.play();

                if (score % 1000 === 0 && score > 0) {
                    shakeDuration = 20;
                    triggerShake();
                }

                if (score % 10 === 0) {
                    triggerFlash();
                }

                if (group.length > record) {
                    record = group.length;
                    select("#record").html(record + " / " + cols * rows);
                    //sound2.play();
                    //sound3.play();
                    triggerShake();
                }

                waitingToCollapse = true;
            } else {
                // 🔥 Auto bomb: destroy single if enough points
                if (score >= bombCost) {
                    b.isBomb = true;
                    b.collapsing = true;
                    score -= bombCost;
                    select("#score").html(score);
                    sound4.play();
                    waitingToCollapse = true;
                    triggerShake();
                } else {
                    showModal(
                        `Not enough points for bombs!<br>A bomb costs you ${bombCost} coins. <br>Pop fruit to get coins.`,
                        "bomb",
                        "Out of bombs!"
                    );
                }
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

function createBox(y) {
    let fruitType = random(currentFruits);
    return {
        exists: true,
        targetY: y,
        animY: y,
        collapsing: false,
        size: boxSize,
        fruit: fruitType,
    };
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

function checkAchievements(group) {
    // 1. Track highest streak for each fruit
    let fruitType = grid[group[0].x][group[0].y].fruit;

    if (group.length == rows * cols) {
        achievements.bestStreaks[fruitType] = group.length;
        showNotification(`🎉 ${fruitType}s completed.`);

        // Add next fruit if available
        if (currentFruits.length < fruits.length) {
            for (let f of fruits) {
                if (!currentFruits.includes(f)) {
                    currentFruits.push(f);
                    showModal(
                        `What a juicy pop!<br> 
                         You completed the board<br>
                         with all ${rows * cols} ${fruitType}s!`,
                        fruitType,
                        `Master of ${fruitType}!`
                    );
                    break;
                }
            }
        }
    }

    if (group.length > achievements.bestStreaks[fruitType]) {
        achievements.bestStreaks[fruitType] = group.length;
        showNotification(`🎉 ${group.length} ${fruitType}s combo.`);
    }
}

function isGridEmpty() {
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (grid[x][y].exists) return false;
        }
    }
    return true;
}

function showNotification(message, sound) {
    let container = select("#notification");

    let div = createDiv(message);
    div.parent(container);
    div.addClass("achievement-message");

    // Automatically remove after 2 seconds
    setTimeout(() => {
        div.remove();
    }, 2000);

    // Optional sound
    if (!sound) {
        sound2.play();
    } else {
        sound.play();
    }
}

function showModal(message, img, title) {
    select("#title").html(title);

    select("#modal").addClass("shake");
    select("#modal").removeClass("hidden");
    select("#modal .coin").html(`<img src="images/${img}.png">`);
    select("#message").html(message);
    select("#gameContainer").removeClass("active");
}

function continueGame() {
    select("#modal").addClass("hidden");
    select("#gameContainer").addClass("active");
}
