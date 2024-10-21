const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// Player object
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 60,
    width: 50,
    height: 50,
    speed: 7,
    bullets: [],
};

// Enemy object
let enemies = [];
const enemySpeed = 3;
const bulletSpeed = 7;
let score = 0;
let gameOver = false;

// Create bullets
function shoot() {
    player.bullets.push({
        x: player.x + player.width / 2 - 5,
        y: player.y,
        width: 10,
        height: 20,
        color: 'yellow'
    });
}

// Move player
function movePlayer() {
    if (keys.ArrowLeft && player.x > 0) {
        player.x -= player.speed;
    } else if (keys.ArrowRight && player.x + player.width < canvas.width) {
        player.x += player.speed;
    }
}

// Move bullets
function moveBullets() {
    player.bullets = player.bullets.filter(bullet => bullet.y > 0);
    player.bullets.forEach(bullet => {
        bullet.y -= bulletSpeed;
    });
}

// Create enemies
function createEnemy() {
    enemies.push({
        x: Math.random() * (canvas.width - 50),
        y: 0,
        width: 50,
        height: 50,
        color: 'red'
    });
}

// Move enemies
function moveEnemies() {
    enemies.forEach(enemy => {
        enemy.y += enemySpeed;
        if (enemy.y + enemy.height > canvas.height) {
            gameOver = true;
        }
    });
}

// Detect collisions
function detectCollisions() {
    player.bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                // Remove bullet and enemy on collision
                player.bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);
                score += 10;
            }
        });
    });
}

// Draw player
function drawPlayer() {
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

// Draw bullets
function drawBullets() {
    player.bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

// Draw enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });
}

// Game loop
function gameLoop() {
    if (gameOver) {
        ctx.fillStyle = "white";
        ctx.font = "40px Arial";
        ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    movePlayer();
    moveBullets();
    moveEnemies();
    detectCollisions();

    drawPlayer();
    drawBullets();
    drawEnemies();

    requestAnimationFrame(gameLoop);
}

// Spawn enemies periodically
setInterval(createEnemy, 1000);

// Listen to keyboard events
const keys = {};
window.addEventListener("keydown", (event) => {
    keys[event.code] = true;
    if (event.code === "Space") {
        shoot();
    }
});

window.addEventListener("keyup", (event) => {
    keys[event.code] = false;
});

// Start game
gameLoop();
