const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVEMENT_SPEED = 5;
const SNOWFLAKE_COUNT = 15;
const SNOWFLAKE_SIZE = 8;
const PARTICLE_COUNT = 50;

// Game state
let score = 0;
let wasOnGround = false;
let isExploding = false;
let explosionParticles = [];

// Particle class for explosion effect
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed - 2;
        this.life = 1.0;
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.velocityY += 0.2;
        this.life -= 0.02;
    }

    draw(ctx) {
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size
        );
        gradient.addColorStop(0, `rgba(255, ${Math.random() * 100}, 0, ${this.life})`);
        gradient.addColorStop(1, `rgba(255, ${Math.random() * 50}, 0, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Snowflakes
class Snowflake {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * CANVAS_WIDTH;
        this.y = -SNOWFLAKE_SIZE;
        this.speed = 1 + Math.random() * 2;
        this.active = true;
    }

    update() {
        this.y += this.speed;
        if (this.y > CANVAS_HEIGHT) {
            this.reset();
        }
    }

    checkCollision(player) {
        if (!this.active) return false;
        
        const distance = Math.sqrt(
            Math.pow(this.x - (player.x + player.width/2), 2) +
            Math.pow(this.y - (player.y + player.height/2), 2)
        );
        
        return distance < (player.width/2 + SNOWFLAKE_SIZE/2);
    }

    draw(ctx) {
        if (!this.active) return;
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        
        // Draw 6 arms of the snowflake
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            
            // Main arm
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(SNOWFLAKE_SIZE, 0);
            
            // Branch 1 (at 60% of main arm)
            ctx.moveTo(SNOWFLAKE_SIZE * 0.6, 0);
            ctx.lineTo(SNOWFLAKE_SIZE * 0.8, SNOWFLAKE_SIZE * 0.2);
            ctx.moveTo(SNOWFLAKE_SIZE * 0.6, 0);
            ctx.lineTo(SNOWFLAKE_SIZE * 0.8, -SNOWFLAKE_SIZE * 0.2);
            
            // Branch 2 (at 30% of main arm)
            ctx.moveTo(SNOWFLAKE_SIZE * 0.3, 0);
            ctx.lineTo(SNOWFLAKE_SIZE * 0.5, SNOWFLAKE_SIZE * 0.15);
            ctx.moveTo(SNOWFLAKE_SIZE * 0.3, 0);
            ctx.lineTo(SNOWFLAKE_SIZE * 0.5, -SNOWFLAKE_SIZE * 0.15);
            
            ctx.stroke();
            ctx.restore();
        }
        
        // Center dot
        ctx.beginPath();
        ctx.arc(this.x, this.y, SNOWFLAKE_SIZE * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
}

function createExplosion(x, y) {
    isExploding = true;
    explosionParticles = Array.from(
        { length: PARTICLE_COUNT }, 
        () => new Particle(x + player.width/2, y + player.height/2)
    );
}

const snowflakes = Array.from({ length: SNOWFLAKE_COUNT }, () => new Snowflake());

// Set canvas size
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Player object
const player = {
    x: CANVAS_WIDTH / 4,
    y: CANVAS_HEIGHT / 2,
    width: 40,
    height: 40,
    velocityX: 0,
    velocityY: 0,
    isJumping: false,
    visible: true,
    direction: 'right'
};

// Platform constants
const PLATFORM_SINK_SPEED = 0.5;
const MIN_PLATFORM_WIDTH = 120;
const MAX_PLATFORM_WIDTH = 200;
const PLATFORM_HEIGHT = 20;
const MIN_PLATFORM_SPACING = 100;

// Create initial platforms
let platforms = [
    { x: CANVAS_WIDTH / 4 - 50, y: CANVAS_HEIGHT * 0.75, width: 200, height: PLATFORM_HEIGHT },
    { x: CANVAS_WIDTH / 2 + 100, y: CANVAS_HEIGHT * 0.6, width: 150, height: PLATFORM_HEIGHT },
    { x: CANVAS_WIDTH / 8, y: CANVAS_HEIGHT * 0.45, width: 120, height: PLATFORM_HEIGHT },
    { x: CANVAS_WIDTH / 2 - 50, y: CANVAS_HEIGHT * 0.3, width: 180, height: PLATFORM_HEIGHT },
    { x: CANVAS_WIDTH * 0.75, y: CANVAS_HEIGHT * 0.4, width: 160, height: PLATFORM_HEIGHT },
    { x: CANVAS_WIDTH * 0.1, y: CANVAS_HEIGHT * 0.85, width: 140, height: PLATFORM_HEIGHT }
];

// Function to generate a new platform
function generatePlatform() {
    const width = MIN_PLATFORM_WIDTH + Math.random() * (MAX_PLATFORM_WIDTH - MIN_PLATFORM_WIDTH);
    const x = Math.random() * (CANVAS_WIDTH - width);
    return {
        x,
        y: -PLATFORM_HEIGHT,
        width,
        height: PLATFORM_HEIGHT
    };
}

// Function to check if we need a new platform
function needNewPlatform() {
    const highestPlatform = platforms.reduce((highest, platform) => 
        platform.y < highest ? platform.y : highest, CANVAS_HEIGHT);
    return highestPlatform > MIN_PLATFORM_SPACING;
}

// Function to update platforms
function updatePlatforms() {
    // Move platforms down
    platforms.forEach(platform => {
        platform.y += PLATFORM_SINK_SPEED;
    });

    // Remove platforms that are off screen
    platforms = platforms.filter(platform => platform.y < CANVAS_HEIGHT + PLATFORM_HEIGHT);

    // Add new platform if needed
    if (needNewPlatform()) {
        platforms.push(generatePlatform());
    }
}

// Fox pixel art (16x16 grid)
function drawFox(x, y, direction) {
    if (!player.visible) return;
    
    const pixelSize = player.width / 16;
    const pixels = [
        "0000111111110000",
        "0001111111111000",
        "0011111111111100",
        "0111111111111110",
        "0111122112211110",
        "0111112222111110",
        "0011111111111100",
        "0001111111111000",
        "0011111111111100",
        "0111111111111110",
        "0111111111111110",
        "0011111111111100",
        "0001111111111000",
        "0001111111111000",
        "0000111001110000",
        "0000110000110000"
    ];

    const colors = {
        '1': '#ffffff', // White for body
        '2': '#000000'  // Black for eyes
    };

    pixels.forEach((row, i) => {
        const rowPixels = direction === 'left' ? row.split('').reverse() : row.split('');
        rowPixels.forEach((pixel, j) => {
            if (pixel !== '0' && colors[pixel]) {
                ctx.fillStyle = colors[pixel];
                ctx.fillRect(
                    x + j * pixelSize,
                    y + i * pixelSize,
                    pixelSize,
                    pixelSize
                );
            }
        });
    });
}

// Draw platform with snow decoration
function drawPlatform(platform) {
    // Main platform
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    
    // Snow top
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(platform.x, platform.y, platform.width, 5);
    
    // Snow particles
    for (let i = 0; i < platform.width; i += 10) {
        if (Math.random() > 0.5) {
            ctx.fillRect(
                platform.x + i + Math.random() * 5,
                platform.y + Math.random() * platform.height,
                3,
                3
            );
        }
    }
}

// Game state
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false
};

// Event listeners for keyboard controls
window.addEventListener('keydown', (e) => {
    if (e.key in keys) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key in keys) {
        keys[e.key] = false;
    }
});

// Check collision between player and platforms
function checkPlatformCollisions() {
    let onPlatform = false;
    const wasAbove = player.y < player.y + player.velocityY;

    for (const platform of platforms) {
        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x) {
            
            // Coming from above
            if (wasAbove &&
                player.y + player.height > platform.y &&
                player.y + player.height - player.velocityY <= platform.y) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                onPlatform = true;
            }
            // Coming from below
            else if (!wasAbove &&
                     player.y < platform.y + platform.height &&
                     player.y - player.velocityY >= platform.y + platform.height) {
                player.y = platform.y + platform.height;
                player.velocityY = 0;
            }
        }
    }
    return onPlatform;
}

// Update game state
function update() {
    if (isExploding) {
        explosionParticles = explosionParticles.filter(particle => particle.life > 0);
        explosionParticles.forEach(particle => particle.update());
        
        if (explosionParticles.length === 0) {
            isExploding = false;
            player.visible = true;
            player.x = CANVAS_WIDTH / 4;
            player.y = CANVAS_HEIGHT / 2;
            player.velocityX = 0;
            player.velocityY = 0;
        }
        return;
    }

    // Horizontal movement with direction
    if (keys.ArrowLeft) {
        player.velocityX = -MOVEMENT_SPEED;
        player.direction = 'left';
    } else if (keys.ArrowRight) {
        player.velocityX = MOVEMENT_SPEED;
        player.direction = 'right';
    } else {
        player.velocityX = 0;
    }

    // Apply gravity
    player.velocityY += GRAVITY;

    // Jumping
    if (keys.ArrowUp && !player.isJumping) {
        player.velocityY = JUMP_FORCE;
        player.isJumping = true;
    }

    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;

    // Platform collisions
    if (checkPlatformCollisions()) {
        player.isJumping = false;
    }

    // Screen boundaries and ground collision
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;
    if (player.y + player.height > CANVAS_HEIGHT) {
        if (!wasOnGround) {
            score = 0;
            wasOnGround = true;
            player.visible = false;
            createExplosion(player.x, player.y);
        }
    } else {
        wasOnGround = false;
    }

    // Update and check snowflake collisions
    snowflakes.forEach(snowflake => {
        snowflake.update();
        if (snowflake.checkCollision(player) && snowflake.active) {
            score += 1;
            snowflake.active = false;
            setTimeout(() => {
                snowflake.reset();
            }, 1000);
        }
    });

    // Update platforms
    updatePlatforms();
}

// Create background canvas
const bgCanvas = document.createElement('canvas');
bgCanvas.width = CANVAS_WIDTH;
bgCanvas.height = CANVAS_HEIGHT;
const bgCtx = bgCanvas.getContext('2d');

// Draw static mountain background
function createBackground() {
    // Sky gradient
    const skyGradient = bgCtx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGradient.addColorStop(0, '#87CEEB');  // Light blue at top
    skyGradient.addColorStop(1, '#E0F6FF');  // Lighter blue at bottom
    bgCtx.fillStyle = skyGradient;
    bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Mountains
    const mountainColors = ['#E3E3E3', '#D3D3D3', '#C3C3C3'];
    const mountainLayers = [
        { peaks: 3, height: 0.7, peakHeights: [350, 300, 320] },
        { peaks: 4, height: 0.5, peakHeights: [400, 380, 420, 390] },
        { peaks: 5, height: 0.3, peakHeights: [450, 470, 440, 460, 455] }
    ];

    mountainLayers.forEach((layer, i) => {
        bgCtx.fillStyle = mountainColors[i];
        bgCtx.beginPath();
        bgCtx.moveTo(0, CANVAS_HEIGHT);

        const peakWidth = CANVAS_WIDTH / (layer.peaks - 1);
        for (let p = 0; p < layer.peaks; p++) {
            const x = p * peakWidth;
            const peakHeight = layer.peakHeights[p];
            
            if (p === 0) {
                bgCtx.lineTo(x, peakHeight);
            } else {
                // Create jagged peaks with fixed positions
                const steps = 5;
                const stepWidth = peakWidth / steps;
                const prevPeakHeight = layer.peakHeights[p - 1];
                for (let s = 1; s < steps; s++) {
                    const stepX = x - peakWidth + (s * stepWidth);
                    const progress = s / steps;
                    const stepY = prevPeakHeight + (peakHeight - prevPeakHeight) * progress +
                                Math.sin(progress * Math.PI) * 15;
                    bgCtx.lineTo(stepX, stepY);
                }
                bgCtx.lineTo(x, peakHeight);
            }
        }
        bgCtx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
        bgCtx.fill();
    });
}

// Create the static background once
createBackground();

// Render game objects
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw static background
    ctx.drawImage(bgCanvas, 0, 0);

    // Draw platforms with snow
    platforms.forEach(platform => {
        drawPlatform(platform);
    });

    // Draw snowflakes
    snowflakes.forEach(snowflake => snowflake.draw(ctx));

    // Draw explosion particles
    explosionParticles.forEach(particle => particle.draw(ctx));

    // Draw player (fox)
    drawFox(player.x, player.y, player.direction);

    // Draw score
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 40);
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();
