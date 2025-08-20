// 게임 상태 및 설정
const GAME_CONFIG = {
    CANVAS_WIDTH: window.innerWidth,
    CANVAS_HEIGHT: window.innerHeight,
    PLAYER_SIZE: 15,
    PLAYER_SPEED: 3,
    PLAYER_RUN_SPEED: 5,
    BULLET_SPEED: 12,
    BULLET_SIZE: 6,
    ENEMY_SIZE: 12,
    ENEMY_SPEED: 1,
    INITIAL_ENEMIES: 30,
    MAP_SIZE: 2000,
    SAFEZONE_SHRINK_TIME: 30000,
    SAFEZONE_DAMAGE: 5
};

// 게임 변수
let canvas, ctx;
let gameState = 'menu';
let player;
let enemies = [];
let bullets = [];
let particles = [];
let camera = { x: 0, y: 0 };
let keys = {};
let mouse = { x: 0, y: 0, down: false };
let gameTime = 0;
let kills = 0;
let survivors = 31;
let safezone = {
    x: GAME_CONFIG.MAP_SIZE / 2,
    y: GAME_CONFIG.MAP_SIZE / 2,
    radius: GAME_CONFIG.MAP_SIZE / 2,
    targetRadius: GAME_CONFIG.MAP_SIZE / 2
};

// 경험치 및 스킬 시스템
let experience = 0;
let level = 1;
let skillPoints = 0;
let pendingLevelUp = false;

// 무기 타입 정의
const WEAPON_TYPES = {
    ASSAULT_RIFLE: {
        name: '돌격소총',
        damage: 25,
        fireRate: 150,
        maxAmmo: 30,
        reloadTime: 2000,
        accuracy: 0.95,
        range: 200
    },
    SNIPER_RIFLE: {
        name: '저격총',
        damage: 80,
        fireRate: 800,
        maxAmmo: 5,
        reloadTime: 3000,
        accuracy: 0.99,
        range: 400 // 사거리 늘림
    },
    SHOTGUN: {
        name: '샷건',
        damage: 60,
        fireRate: 600,
        maxAmmo: 8,
        reloadTime: 2500,
        accuracy: 0.8,
        range: 80,
        pellets: 5
    },
    SMG: {
        name: '기관단총',
        damage: 18,
        fireRate: 80,
        maxAmmo: 40,
        reloadTime: 1500,
        accuracy: 0.85,
        range: 120
    },
    LMG: {
        name: '경기관총',
        damage: 35,
        fireRate: 200,
        maxAmmo: 100,
        reloadTime: 4000,
        accuracy: 0.9,
        range: 250
    }
};

// 스킬 트리 정의
const SKILL_TREE = {
    ASSAULT_RIFLE: {
        base: { name: '돌격소총 마스터', description: '돌격소총 해제', weaponType: 'ASSAULT_RIFLE' },
        upgrades: [
            { name: '향상된 정확도', description: '정확도 +10%', stat: 'accuracy', value: 0.1 },
            { name: '빠른 재장전', description: '재장전 속도 +25%', stat: 'reloadTime', value: -0.25 },
            { name: '확장 탄창', description: '탄창 용량 +50%', stat: 'maxAmmo', value: 0.5 },
            { name: '강화 탄환', description: '데미지 +40%', stat: 'damage', value: 0.4 }
        ]
    },
    SNIPER_RIFLE: {
        base: { name: '저격총 마스터', description: '저격총 해제', weaponType: 'SNIPER_RIFLE' },
        upgrades: [
            { name: '완벽한 조준', description: '정확도 +5%', stat: 'accuracy', value: 0.05 },
            { name: '관통탄', description: '데미지 +60%', stat: 'damage', value: 0.6 },
            { name: '빠른 볼트액션', description: '연사속도 +30%', stat: 'fireRate', value: -0.3 },
            { name: '확장 탄창', description: '탄창 용량 +100%', stat: 'maxAmmo', value: 1.0 }
        ]
    },
    SHOTGUN: {
        base: { name: '샷건 마스터', description: '샷건 해제', weaponType: 'SHOTGUN' },
        upgrades: [
            { name: '확산 강화', description: '펠릿 수 +40%', stat: 'pellets', value: 0.4 },
            { name: '강화 산탄', description: '데미지 +50%', stat: 'damage', value: 0.5 },
            { name: '빠른 펌핑', description: '연사속도 +40%', stat: 'fireRate', value: -0.4 },
            { name: '확장 튜브', description: '탄창 용량 +75%', stat: 'maxAmmo', value: 0.75 }
        ]
    },
    SMG: {
        base: { name: '기관단총 마스터', description: '기관단총 해제', weaponType: 'SMG' },
        upgrades: [
            { name: '고속 연사', description: '연사속도 +50%', stat: 'fireRate', value: -0.5 },
            { name: '안정화 시스템', description: '정확도 +15%', stat: 'accuracy', value: 0.15 },
            { name: '대용량 탄창', description: '탄창 용량 +75%', stat: 'maxAmmo', value: 0.75 },
            { name: '고위력 탄환', description: '데미지 +55%', stat: 'damage', value: 0.55 }
        ]
    },
    LMG: {
        base: { name: '경기관총 마스터', description: '경기관총 해제', weaponType: 'LMG' },
        upgrades: [
            { name: '억압 사격', description: '데미지 +45%', stat: 'damage', value: 0.45 },
            { name: '안정화 바이포드', description: '정확도 +12%', stat: 'accuracy', value: 0.12 },
            { name: '개선된 벨트', description: '탄창 용량 +50%', stat: 'maxAmmo', value: 0.5 },
            { name: '향상된 총열', description: '연사속도 +25%', stat: 'fireRate', value: -0.25 }
        ]
    }
};

// 플레이어 스킬 상태
let playerSkills = {
    unlockedWeapons: ['ASSAULT_RIFLE'], // 기본 무기
    currentWeapon: 'ASSAULT_RIFLE',
    weaponUpgrades: {
        ASSAULT_RIFLE: 0,
        SNIPER_RIFLE: 0,
        SHOTGUN: 0,
        SMG: 0,
        LMG: 0
    }
};

// 플레이어 클래스
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = GAME_CONFIG.PLAYER_SIZE;
        this.health = 100;
        this.maxHealth = 100;
        this.angle = 0;
        this.isRunning = false;
        this.updateWeaponStats();
    }

    updateWeaponStats() {
        let weaponType = WEAPON_TYPES[playerSkills.currentWeapon];
        let upgradeLevel = playerSkills.weaponUpgrades[playerSkills.currentWeapon];
        let skillData = SKILL_TREE[playerSkills.currentWeapon];
        
        // 기본 무기 스탯
        this.weapon = {
            type: playerSkills.currentWeapon,
            damage: weaponType.damage,
            fireRate: weaponType.fireRate,
            maxAmmo: weaponType.maxAmmo,
            reloadTime: weaponType.reloadTime,
            accuracy: weaponType.accuracy,
            range: weaponType.range,
            pellets: weaponType.pellets || 1,
            ammo: weaponType.maxAmmo,
            totalAmmo: weaponType.maxAmmo * 4,
            lastReload: 0,
            isReloading: false,
            lastShot: 0
        };

        // 업그레이드 적용
        for (let i = 0; i < upgradeLevel; i++) {
            let upgrade = skillData.upgrades[i];
            if (upgrade.stat === 'reloadTime' || upgrade.stat === 'fireRate') {
                this.weapon[upgrade.stat] *= (1 + upgrade.value);
            } else {
                this.weapon[upgrade.stat] *= (1 + upgrade.value);
            }
        }

        // 정수로 변환이 필요한 스탯들
        this.weapon.maxAmmo = Math.floor(this.weapon.maxAmmo);
        this.weapon.damage = Math.floor(this.weapon.damage);
        this.weapon.reloadTime = Math.floor(this.weapon.reloadTime);
        this.weapon.fireRate = Math.floor(this.weapon.fireRate);
        this.weapon.pellets = Math.floor(this.weapon.pellets);
        
        // 현재 탄약 조정
        this.weapon.ammo = Math.min(this.weapon.ammo, this.weapon.maxAmmo);
        this.weapon.totalAmmo = this.weapon.maxAmmo * 4;
    }

    update() {
        let speed = this.isRunning ? GAME_CONFIG.PLAYER_RUN_SPEED : GAME_CONFIG.PLAYER_SPEED;
        let dx = 0, dy = 0;

        if (keys['w'] || keys['ArrowUp']) dy -= speed;
        if (keys['s'] || keys['ArrowDown']) dy += speed;
        if (keys['a'] || keys['ArrowLeft']) dx -= speed;
        if (keys['d'] || keys['ArrowRight']) dx += speed;

        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        this.x = Math.max(this.size, Math.min(GAME_CONFIG.MAP_SIZE - this.size, this.x + dx));
        this.y = Math.max(this.size, Math.min(GAME_CONFIG.MAP_SIZE - this.size, this.y + dy));

        this.angle = Math.atan2(mouse.y + camera.y - this.y, mouse.x + camera.x - this.x);

        let distanceFromCenter = Math.sqrt(
            Math.pow(this.x - safezone.x, 2) + Math.pow(this.y - safezone.y, 2)
        );
        if (distanceFromCenter > safezone.radius) {
            this.takeDamage(GAME_CONFIG.SAFEZONE_DAMAGE / 60);
        }

        if (this.weapon.isReloading && Date.now() - this.weapon.lastReload > this.weapon.reloadTime) {
            this.weapon.isReloading = false;
            let reloadAmount = Math.min(this.weapon.maxAmmo, this.weapon.totalAmmo);
            this.weapon.totalAmmo -= reloadAmount;
            this.weapon.ammo = reloadAmount;
        }
    }

        shoot() {
        if (this.weapon.ammo > 0 && !this.weapon.isReloading && 
            Date.now() - this.weapon.lastShot > this.weapon.fireRate) {
            
            this.weapon.ammo--;
            this.weapon.lastShot = Date.now();

            // 샷건의 경우 여러 발의 펠릿 발사
            if (this.weapon.type === 'SHOTGUN') {
                for (let i = 0; i < this.weapon.pellets; i++) {
                    let spread = (Math.random() - 0.5) * 0.6; // 산탄 확산
                    bullets.push(new Bullet(
                        this.x + Math.cos(this.angle) * this.size,
                        this.y + Math.sin(this.angle) * this.size,
                        this.angle + spread,
                        'player',
                        this.weapon.damage / this.weapon.pellets, // 펠릿당 데미지
                        this.weapon.range,
                        this.weapon.type
                    ));
                }
    } else {
                // 정확도에 따른 확산
                let spread = (Math.random() - 0.5) * (1 - this.weapon.accuracy) * 0.2;
                bullets.push(new Bullet(
                    this.x + Math.cos(this.angle) * this.size,
                    this.y + Math.sin(this.angle) * this.size,
                    this.angle + spread,
                    'player',
                    this.weapon.damage,
                    this.weapon.range,
                    this.weapon.type
                ));
            }

            createMuzzleFlash(this.x, this.y, this.angle, this.weapon.type);
            
            // 탄약이 다 떨어지면 자동 재장전
            if (this.weapon.ammo === 0 && this.weapon.totalAmmo > 0) {
                this.reload();
            }
        }
    }

    reload() {
        if (!this.weapon.isReloading && this.weapon.ammo < this.weapon.maxAmmo && this.weapon.totalAmmo > 0) {
            this.weapon.isReloading = true;
            this.weapon.lastReload = Date.now();
        }
    }

    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
        if (this.health <= 0) {
            gameState = 'gameOver';
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.rotate(this.angle);

        // 플레이어 몸체
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);

        // 무기별 다른 모양으로 그리기
        this.drawWeapon();

        ctx.restore();
    }

    drawWeapon() {
        let weaponLength = this.size;
        let weaponWidth = 4;
        
        switch(this.weapon.type) {
            case 'SNIPER_RIFLE':
                ctx.fillStyle = '#2F4F4F'; // 어두운 회색
                weaponLength = this.size * 1.5; // 더 긴 총
                weaponWidth = 3;
                break;
            case 'SHOTGUN':
                ctx.fillStyle = '#8B4513'; // 갈색
                weaponLength = this.size * 1.2;
                weaponWidth = 6; // 더 두꺼운 총
                break;
            case 'SMG':
                ctx.fillStyle = '#000000'; // 검은색
                weaponLength = this.size * 0.8; // 짧은 총
                weaponWidth = 3;
                break;
            case 'LMG':
                ctx.fillStyle = '#696969'; // 회색
                weaponLength = this.size * 1.3;
                weaponWidth = 7; // 가장 두꺼운 총
                break;
            default: // ASSAULT_RIFLE
                ctx.fillStyle = '#333';
                break;
        }
        
        ctx.fillRect(this.size/2, -weaponWidth/2, weaponLength, weaponWidth);
    }
}

// 적 클래스
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = GAME_CONFIG.ENEMY_SIZE;
        this.health = 50;
        this.maxHealth = 50;
        this.angle = 0;
        this.lastShot = 0;
        this.fireRate = 800 + Math.random() * 500;
        this.detectionRange = 150;
        this.shootRange = 120;
    }

    update() {
        let dx = player.x - this.x;
        let dy = player.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.detectionRange) {
            this.angle = Math.atan2(dy, dx);
            
            if (distance > 30) {
                this.x += Math.cos(this.angle) * GAME_CONFIG.ENEMY_SPEED;
                this.y += Math.sin(this.angle) * GAME_CONFIG.ENEMY_SPEED;
            }

            if (distance < this.shootRange && Date.now() - this.lastShot > this.fireRate) {
                this.shoot();
            }
    } else {
            this.angle += (Math.random() - 0.5) * 0.2;
            this.x += Math.cos(this.angle) * GAME_CONFIG.ENEMY_SPEED * 0.3;
            this.y += Math.sin(this.angle) * GAME_CONFIG.ENEMY_SPEED * 0.3;
        }

        this.x = Math.max(this.size, Math.min(GAME_CONFIG.MAP_SIZE - this.size, this.x));
        this.y = Math.max(this.size, Math.min(GAME_CONFIG.MAP_SIZE - this.size, this.y));

        let distanceFromCenter = Math.sqrt(
            Math.pow(this.x - safezone.x, 2) + Math.pow(this.y - safezone.y, 2)
        );
        if (distanceFromCenter > safezone.radius) {
            this.takeDamage(GAME_CONFIG.SAFEZONE_DAMAGE / 60);
        }
    }

    shoot() {
        this.lastShot = Date.now();
        bullets.push(new Bullet(
            this.x + Math.cos(this.angle) * this.size,
            this.y + Math.sin(this.angle) * this.size,
            this.angle,
            'enemy',
            25,
            150,
            'ASSAULT_RIFLE'
        ));
    }

    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.rotate(this.angle);

        ctx.fillStyle = '#F44336';
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);

        ctx.restore();
        let healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - camera.x - this.size/2, this.y - camera.y - this.size, this.size, 3);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - camera.x - this.size/2, this.y - camera.y - this.size, this.size * healthPercent, 3);
    }
}

// 총알 클래스
class Bullet {
    constructor(x, y, angle, owner, damage = 25, range = 200, weaponType = 'ASSAULT_RIFLE') {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.angle = angle;
        this.owner = owner;
        this.damage = damage;
        this.range = range;
        this.weaponType = weaponType;
        this.distanceTraveled = 0;
        
        // 무기별 총알 특성 설정
        this.setBulletProperties();
    }

    setBulletProperties() {
        switch(this.weaponType) {
            case 'SNIPER_RIFLE':
                this.speed = GAME_CONFIG.BULLET_SPEED * 2; // 저격총은 더 빠름
                this.size = GAME_CONFIG.BULLET_SIZE + 1.5; // 더 큰 총알
                this.color = '#FF4444'; // 빨간색
                break;
            case 'SHOTGUN':
                this.speed = GAME_CONFIG.BULLET_SPEED * 0.8; // 샷건은 조금 느림
                this.size = GAME_CONFIG.BULLET_SIZE + 2;
                this.color = '#FFA500'; // 주황색
                break;
            case 'SMG':
                this.speed = GAME_CONFIG.BULLET_SPEED * 1.2; // 기관단총은 빠름
                this.size = GAME_CONFIG.BULLET_SIZE - 1;
                this.color = '#00FF00'; // 초록색
                break;
            case 'LMG':
                this.speed = GAME_CONFIG.BULLET_SPEED * 0.9;
                this.size = GAME_CONFIG.BULLET_SIZE + 3; // 가장 큰 총알
                this.color = '#8B4513'; // 갈색
                break;
            default: // ASSAULT_RIFLE
                this.speed = GAME_CONFIG.BULLET_SPEED;
                this.size = GAME_CONFIG.BULLET_SIZE;
                this.color = this.owner === 'player' ? '#FFD700' : '#FF6666'; // 플레이어는 금색, 적은 연한 빨간색
                break;
        }
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        this.distanceTraveled = Math.sqrt(
            Math.pow(this.x - this.startX, 2) + Math.pow(this.y - this.startY, 2)
        );

        // 사거리 초과 또는 맵 경계를 벗어나면 제거
        return this.distanceTraveled > this.range ||
               this.x < 0 || this.x > GAME_CONFIG.MAP_SIZE || 
               this.y < 0 || this.y > GAME_CONFIG.MAP_SIZE;
    }

    draw() {
        ctx.fillStyle = this.color;
        
        // 저격총 총알은 더 눈에 띄게 표시
        if (this.weaponType === 'SNIPER_RIFLE') {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 3;
            ctx.fillRect(
                this.x - camera.x - this.size/2,
                this.y - camera.y - this.size/2,
                this.size,
                this.size
            );
            ctx.shadowBlur = 0;
        } else {
            ctx.fillRect(
                this.x - camera.x - this.size/2,
                this.y - camera.y - this.size/2,
                this.size,
                this.size
            );
        }
    }
}

// 파티클 클래스
class Particle {
    constructor(x, y, color, size, velocity) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.velocity = velocity;
        this.life = 1.0;
        this.decay = 0.04; // 파티클이 더 빨리 사라지게
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.life -= this.decay;
        return this.life <= 0;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.x - camera.x - this.size/2,
            this.y - camera.y - this.size/2,
            this.size,
            this.size
        );
        ctx.globalAlpha = 1.0;
    }
}

function createMuzzleFlash(x, y, angle, weaponType = 'ASSAULT_RIFLE') {
    let particleCount = 3; // 파티클 수 줄임
    let flashColor = '#FFD700';
    
    // 무기별 총구 화염 특성
    switch(weaponType) {
        case 'SNIPER_RIFLE':
            particleCount = 2;
            flashColor = '#FF4444';
            break;
        case 'SHOTGUN':
            particleCount = 4;
            flashColor = '#FFA500';
            break;
        case 'SMG':
            particleCount = 2;
            flashColor = '#00FF00';
            break;
        case 'LMG':
            particleCount = 5;
            flashColor = '#8B4513';
            break;
    }
    
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(
            x + Math.cos(angle) * 15,
            y + Math.sin(angle) * 15,
            flashColor,
            Math.random() * 4 + 1, // 크기 줄임
            {
                x: Math.cos(angle + (Math.random() - 0.5) * 0.3) * (Math.random() * 2 + 0.5),
                y: Math.sin(angle + (Math.random() - 0.5) * 0.3) * (Math.random() * 2 + 0.5)
            }
        ));
    }
}

function createBloodSplatter(x, y) {
    for (let i = 0; i < 8; i++) {
        particles.push(new Particle(
            x, y, '#FF0000', Math.random() * 4 + 1,
            {
                x: (Math.random() - 0.5) * 6,
                y: (Math.random() - 0.5) * 6
            }
        ));
    }
}

function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    player = new Player(GAME_CONFIG.MAP_SIZE / 2, GAME_CONFIG.MAP_SIZE / 2);

    enemies = [];
    for (let i = 0; i < GAME_CONFIG.INITIAL_ENEMIES; i++) {
        let x, y;
        do {
            x = Math.random() * GAME_CONFIG.MAP_SIZE;
            y = Math.random() * GAME_CONFIG.MAP_SIZE;
        } while (Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2) < 100);
        
        enemies.push(new Enemy(x, y));
    }

    survivors = GAME_CONFIG.INITIAL_ENEMIES + 1;
    setupEventListeners();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    GAME_CONFIG.CANVAS_WIDTH = canvas.width;
    GAME_CONFIG.CANVAS_HEIGHT = canvas.height;
}

function setupEventListeners() {
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key.toLowerCase() === 'r') {
            player.reload();
        }
        if (e.key === 'Shift') {
            player.isRunning = true;
        }
        if (e.key.toLowerCase() === 't' && gameState === 'playing') {
            openSkillTree();
        }
        if (e.key === 'Escape' && gameState === 'skillTree') {
            closeSkillTree();
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
        if (e.key === 'Shift') {
            player.isRunning = false;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    canvas.addEventListener('mousedown', (e) => {
        if (gameState === 'playing') {
            mouse.down = true;
            player.shoot();
        }
    });

    canvas.addEventListener('mouseup', () => {
        mouse.down = false;
    });

    // 게임 버튼들
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    
    // 스킬 트리 버튼들
    document.getElementById('openSkillTree').addEventListener('click', openSkillTree);
    document.getElementById('closeSkillTree').addEventListener('click', closeSkillTree);
    
    // 무기 탭들
    document.querySelectorAll('.weapon-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            // 모든 탭 비활성화
            document.querySelectorAll('.weapon-tab').forEach(t => t.classList.remove('active'));
            // 클릭된 탭 활성화
            e.target.classList.add('active');
            // 스킬 트리 재구성
            buildSkillTree();
        });
    });
}

function startGame() {
    gameState = 'playing';
    document.getElementById('startScreen').classList.add('hidden');
    gameLoop();
}

function restartGame() {
    gameState = 'playing';
    document.getElementById('gameOverScreen').classList.add('hidden');
    
    kills = 0;
    gameTime = 0;
    bullets = [];
    particles = [];
    
    player = new Player(GAME_CONFIG.MAP_SIZE / 2, GAME_CONFIG.MAP_SIZE / 2);
    
    enemies = [];
    for (let i = 0; i < GAME_CONFIG.INITIAL_ENEMIES; i++) {
        let x, y;
        do {
            x = Math.random() * GAME_CONFIG.MAP_SIZE;
            y = Math.random() * GAME_CONFIG.MAP_SIZE;
        } while (Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2) < 100);
        
        enemies.push(new Enemy(x, y));
    }
    
    survivors = GAME_CONFIG.INITIAL_ENEMIES + 1;
    
    safezone = {
        x: GAME_CONFIG.MAP_SIZE / 2,
        y: GAME_CONFIG.MAP_SIZE / 2,
        radius: GAME_CONFIG.MAP_SIZE / 2,
        targetRadius: GAME_CONFIG.MAP_SIZE / 2
    };
    
    gameLoop();
}

function gameLoop() {
    if (gameState !== 'playing') return;
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    gameTime += 16;

    if (gameTime % GAME_CONFIG.SAFEZONE_SHRINK_TIME < 16) {
        safezone.targetRadius = Math.max(50, safezone.targetRadius * 0.8);
    }
    
    safezone.radius += (safezone.targetRadius - safezone.radius) * 0.001;

    player.update();

    camera.x = player.x - GAME_CONFIG.CANVAS_WIDTH / 2;
    camera.y = player.y - GAME_CONFIG.CANVAS_HEIGHT / 2;
    camera.x = Math.max(0, Math.min(GAME_CONFIG.MAP_SIZE - GAME_CONFIG.CANVAS_WIDTH, camera.x));
    camera.y = Math.max(0, Math.min(GAME_CONFIG.MAP_SIZE - GAME_CONFIG.CANVAS_HEIGHT, camera.y));

    if (mouse.down) {
        player.shoot();
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        let bullet = bullets[i];
        
        if (bullet.update()) {
            bullets.splice(i, 1);
            continue;
        }

        if (bullet.owner === 'enemy') {
            let dx = bullet.x - player.x;
            let dy = bullet.y - player.y;
            if (Math.sqrt(dx * dx + dy * dy) < player.size) {
                player.takeDamage(bullet.damage);
                createBloodSplatter(player.x, player.y);
                bullets.splice(i, 1);
                continue;
            }
        }

        if (bullet.owner === 'player') {
            for (let j = enemies.length - 1; j >= 0; j--) {
                let enemy = enemies[j];
                let dx = bullet.x - enemy.x;
                let dy = bullet.y - enemy.y;
                
                if (Math.sqrt(dx * dx + dy * dy) < enemy.size) {
                    createBloodSplatter(enemy.x, enemy.y);
                    
                    if (enemy.takeDamage(bullet.damage)) {
                        enemies.splice(j, 1);
                        kills++;
                        survivors--;
                        gainExperience(50); // 적 처치 시 경험치 획득
                    }
                    
                    bullets.splice(i, 1);
                    break;
                }
            }
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].update()) {
            particles.splice(i, 1);
        }
    }

    if (enemies.length === 0) {
        gameState = 'gameOver';
    }

    updateUI();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    drawSafezone();
    enemies.forEach(enemy => enemy.draw());
    player.draw();
    bullets.forEach(bullet => bullet.draw());
    particles.forEach(particle => particle.draw());
    updateMinimap();
}

function drawMap() {
    ctx.strokeStyle = '#1a4d14';
    ctx.lineWidth = 1;
    
    let startX = Math.floor(camera.x / 100) * 100;
    let startY = Math.floor(camera.y / 100) * 100;
    
    for (let x = startX; x < camera.x + canvas.width + 100; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x - camera.x, 0);
        ctx.lineTo(x - camera.x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = startY; y < camera.y + canvas.height + 100; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0, y - camera.y);
        ctx.lineTo(canvas.width, y - camera.y);
        ctx.stroke();
    }
}

function drawSafezone() {
    ctx.strokeStyle = '#0080ff';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.arc(
        safezone.x - camera.x,
        safezone.y - camera.y,
        safezone.radius,
        0,
        Math.PI * 2
    );
    ctx.stroke();
    ctx.setLineDash([]);
}

function updateUI() {
    let healthPercent = player.health / player.maxHealth;
    document.getElementById('health').textContent = Math.round(player.health);
    document.getElementById('healthFill').style.width = (healthPercent * 100) + '%';

    document.getElementById('currentAmmo').textContent = player.weapon.ammo;
    document.getElementById('totalAmmo').textContent = player.weapon.totalAmmo;
    document.getElementById('currentWeapon').textContent = WEAPON_TYPES[playerSkills.currentWeapon].name;
    document.getElementById('kills').textContent = kills;
    document.getElementById('survivors').textContent = survivors;

    // 경험치 UI 업데이트
    updateExpUI();

    if (gameState === 'gameOver') {
        document.getElementById('finalRank').textContent = survivors + 1;
        document.getElementById('finalKills').textContent = kills;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
}

function updateMinimap() {
    let minimapPlayerX = (player.x / GAME_CONFIG.MAP_SIZE) * 150;
    let minimapPlayerY = (player.y / GAME_CONFIG.MAP_SIZE) * 150;
    
    let minimapPlayer = document.getElementById('minimapPlayer');
    minimapPlayer.style.left = minimapPlayerX + 'px';
    minimapPlayer.style.top = minimapPlayerY + 'px';

    let safezoneElement = document.getElementById('safezone');
    let minimapSafezoneSize = (safezone.radius / GAME_CONFIG.MAP_SIZE) * 150 * 2;
    let minimapSafezoneX = (safezone.x / GAME_CONFIG.MAP_SIZE) * 150 - minimapSafezoneSize / 2;
    let minimapSafezoneY = (safezone.y / GAME_CONFIG.MAP_SIZE) * 150 - minimapSafezoneSize / 2;
    
    safezoneElement.style.width = minimapSafezoneSize + 'px';
    safezoneElement.style.height = minimapSafezoneSize + 'px';
    safezoneElement.style.left = minimapSafezoneX + 'px';
    safezoneElement.style.top = minimapSafezoneY + 'px';
}

// 경험치 시스템
function gainExperience(amount) {
    experience += amount;
    let expNeeded = getExpNeededForNextLevel();
    
    if (experience >= expNeeded) {
        levelUp();
    }
    
    updateExpUI();
}

function getExpNeededForNextLevel() {
    return level * 100; // 레벨당 100씩 증가
}

function levelUp() {
    level++;
    skillPoints++;
    pendingLevelUp = true;
    
    // 스킬 포인트 UI 표시
    document.getElementById('skillPointsCounter').classList.remove('hidden');
    
    // 체력 회복
    player.health = Math.min(player.maxHealth, player.health + 25);
}

function updateExpUI() {
    let expNeeded = getExpNeededForNextLevel();
    let expProgress = (experience / expNeeded) * 100;
    
    document.getElementById('expFill').style.width = expProgress + '%';
    document.getElementById('playerLevel').textContent = level;
    document.getElementById('currentExp').textContent = experience;
    document.getElementById('nextLevelExp').textContent = expNeeded;
    document.getElementById('skillPoints').textContent = skillPoints;
    document.getElementById('availableSkillPoints').textContent = skillPoints;
}

// 스킬 트리 시스템
function openSkillTree() {
    if (gameState === 'playing') {
        gameState = 'skillTree';
        document.getElementById('skillTreeScreen').classList.remove('hidden');
        buildSkillTree();
    }
}

function closeSkillTree() {
    gameState = 'playing';
    document.getElementById('skillTreeScreen').classList.add('hidden');
    if (gameState === 'playing') {
        gameLoop();
    }
}

function buildSkillTree() {
    let activeWeapon = document.querySelector('.weapon-tab.active').dataset.weapon;
    let skillData = SKILL_TREE[activeWeapon];
    let content = document.getElementById('skillTreeContent');
    content.innerHTML = '';

    // 기본 무기 해제 스킬
    let baseCategory = document.createElement('div');
    baseCategory.className = 'skill-category';
    baseCategory.innerHTML = `<h3>기본 무기</h3>`;
    
    let baseSkill = createSkillItem(skillData.base, activeWeapon, -1);
    baseCategory.appendChild(baseSkill);
    content.appendChild(baseCategory);

    // 업그레이드 스킬들
    if (playerSkills.unlockedWeapons.includes(activeWeapon)) {
        let upgradeCategory = document.createElement('div');
        upgradeCategory.className = 'skill-category';
        upgradeCategory.innerHTML = `<h3>무기 강화</h3>`;
        
        skillData.upgrades.forEach((upgrade, index) => {
            let skillItem = createSkillItem(upgrade, activeWeapon, index);
            upgradeCategory.appendChild(skillItem);
        });
        
        content.appendChild(upgradeCategory);
    }

    // 무기 변경 버튼 업데이트
    updateWeaponSwitchButton(activeWeapon);
}

function createSkillItem(skillData, weaponType, upgradeIndex) {
    let isUnlocked = playerSkills.unlockedWeapons.includes(weaponType);
    let upgradeLevel = playerSkills.weaponUpgrades[weaponType];
    let canPurchase = false;
    let isPurchased = false;

    if (upgradeIndex === -1) {
        // 기본 무기 스킬
        canPurchase = !isUnlocked && skillPoints > 0;
        isPurchased = isUnlocked;
    } else {
        // 업그레이드 스킬
        canPurchase = isUnlocked && upgradeIndex === upgradeLevel && skillPoints > 0;
        isPurchased = upgradeIndex < upgradeLevel;
    }

    let skillItem = document.createElement('div');
    skillItem.className = 'skill-item';
    
    if (isPurchased) {
        skillItem.classList.add('purchased');
    } else if (canPurchase) {
        skillItem.classList.add('available');
    } else {
        skillItem.classList.add('locked');
    }

    let buttonText = isPurchased ? '구매됨' : (canPurchase ? '구매' : '잠김');
    let buttonClass = isPurchased ? 'purchased' : '';

    skillItem.innerHTML = `
        <div class="skill-info">
            <div class="skill-name">${skillData.name}</div>
            <div class="skill-description">${skillData.description}</div>
        </div>
        <button class="skill-button ${buttonClass}" 
                ${!canPurchase ? 'disabled' : ''} 
                onclick="purchaseSkill('${weaponType}', ${upgradeIndex})">
            ${buttonText}
        </button>
    `;

    return skillItem;
}

function purchaseSkill(weaponType, upgradeIndex) {
    if (skillPoints <= 0) return;

    if (upgradeIndex === -1) {
        // 기본 무기 해제
        if (!playerSkills.unlockedWeapons.includes(weaponType)) {
            playerSkills.unlockedWeapons.push(weaponType);
            skillPoints--;
        }
    } else {
        // 업그레이드 구매
        if (playerSkills.unlockedWeapons.includes(weaponType) && 
            upgradeIndex === playerSkills.weaponUpgrades[weaponType]) {
            playerSkills.weaponUpgrades[weaponType]++;
            skillPoints--;
        }
    }

    // 현재 무기 스탯 업데이트
    if (weaponType === playerSkills.currentWeapon) {
        player.updateWeaponStats();
    }

    updateExpUI();
    buildSkillTree();
}

function updateWeaponSwitchButton(weaponType) {
    let switchButton = document.getElementById('switchWeapon');
    let isUnlocked = playerSkills.unlockedWeapons.includes(weaponType);
    let isCurrent = weaponType === playerSkills.currentWeapon;

    if (isUnlocked && !isCurrent) {
        switchButton.classList.remove('hidden');
        switchButton.textContent = `${WEAPON_TYPES[weaponType].name}으로 변경`;
        switchButton.onclick = () => switchWeapon(weaponType);
    } else {
        switchButton.classList.add('hidden');
    }
}

function switchWeapon(weaponType) {
    if (playerSkills.unlockedWeapons.includes(weaponType)) {
        playerSkills.currentWeapon = weaponType;
        player.updateWeaponStats();
        closeSkillTree();
    }
}

document.addEventListener('DOMContentLoaded', initGame);
