const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 400;

let player = {
    x: 50,
    y: 300,
    width: 50,
    height: 50,
    color: "red",
    speed: 5,
    jumpPower: -15,
    gravity: 1,
    velocityY: 0,
    isJumping: false
};

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function updatePlayer() {
    player.y += player.velocityY;
    player.velocityY += player.gravity;

    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
        player.isJumping = false;
    }
}

function jump() {
    if (!player.isJumping) {
        player.velocityY = player.jumpPower;
        player.isJumping = true;
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawPlayer();
    updatePlayer();

    requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
        jump();
    }
});

gameLoop();
