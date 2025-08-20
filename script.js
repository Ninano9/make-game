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
let darkOrbs = [];
let darkVoids = [];
let fireballProjectiles = [];
let explosionRings = [];
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

// 무기 타입 정의 (주석처리)
/*
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
        range: 400
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
*/

// 마법 스킬 타입 정의
const MAGIC_TYPES = {
    FIRE: {
        name: '불 마법',
        damage: 30,
        fireRate: 200,
        maxAmmo: 25,
        reloadTime: 2000,
        accuracy: 0.90,
        range: 270, // 1.5배 증가
        element: 'fire'
    },
    ICE: {
        name: '얼음 마법',
        damage: 25,
        fireRate: 250,
        maxAmmo: 20,
        reloadTime: 2200,
        accuracy: 0.95,
        range: 300, // 1.5배 증가
        element: 'ice'
    },
    LIGHTNING: {
        name: '번개 마법',
        damage: 35,
        fireRate: 300,
        maxAmmo: 15,
        reloadTime: 2500,
        accuracy: 0.85,
        range: 330, // 1.5배 증가
        element: 'lightning'
    },
    DARK: {
        name: '암흑 마법',
        damage: 28,
        fireRate: 350,
        maxAmmo: 12,
        reloadTime: 2800,
        accuracy: 0.88,
        range: 280,
        element: 'dark'
    }
};

// 스킬 트리 정의 (마법 + 스탯 강화)
const SKILL_TREE = {
    // 스탯 강화 스킬들
    STATS: {
        base: { name: '기본 능력 향상', description: '캐릭터 기본 능력 강화', category: 'stats' },
        upgrades: [
            { name: '체력 재생', description: '초당 체력 2 회복', stat: 'healthRegen', value: 2 },
            { name: '최대 체력 증가', description: '최대 체력 +50', stat: 'maxHealth', value: 50 },
            { name: '신속함', description: '이동속도 +30%', stat: 'speed', value: 0.3 },
            { name: '탄약 확장', description: '최대 탄약 +100%', stat: 'totalAmmo', value: 1.0 }
        ]
    },
    // 불 마법 스킬
    FIRE: {
        base: { name: '불 마법 마스터', description: '불 마법 해제', magicType: 'FIRE' },
        upgrades: [
            { name: '강화된 화염', description: '데미지 +40%', stat: 'damage', value: 0.4 },
            { name: '빠른 시전', description: '시전속도 +30%', stat: 'fireRate', value: -0.3 },
            { name: '파이어볼', description: 'E키로 광역 파이어볼 사용 가능', stat: 'special', value: 'fireball' },
            { name: '지속 화상', description: '화상 데미지 +100%', stat: 'burnDamage', value: 1.0 },
            { name: '불의 관통', description: '총알이 적을 관통', stat: 'penetration', value: 1 },
            { name: '화염 폭발', description: '적 처치 시 주변에 폭발', stat: 'fireExplosion', value: true },
            { name: '불타는 대지', description: '총알이 바닥에 화염 지대 생성', stat: 'fireGround', value: true },
            { name: '지옥불', description: '화상 데미지가 주변 적에게 전파', stat: 'burnSpread', value: true },
            { name: '🔥 인페르노', description: 'Q키로 거대한 화염 폭풍 소환', stat: 'ultimate', value: 'inferno' }
        ]
    },
    // 얼음 마법 스킬
    ICE: {
        base: { name: '얼음 마법 마스터', description: '얼음 마법 해제', magicType: 'ICE' },
        upgrades: [
            { name: '빙결 강화', description: '빙결 효과 +50%', stat: 'slowEffect', value: 0.5 },
            { name: '마나 효율', description: '재장전 속도 +25%', stat: 'reloadTime', value: -0.25 },
            { name: '블리자드', description: 'E키로 전체 적 빙결', stat: 'special', value: 'blizzard' },
            { name: '절대영도', description: '얼음 데미지 +60%', stat: 'damage', value: 0.6 }
        ]
    },
    // 번개 마법 스킬
    LIGHTNING: {
        base: { name: '번개 마법 마스터', description: '번개 마법 해제', magicType: 'LIGHTNING' },
        upgrades: [
            { name: '연쇄 번개', description: '연쇄 범위 +50%', stat: 'chainRange', value: 0.5 },
            { name: '고전압', description: '데미지 +45%', stat: 'damage', value: 0.45 },
            { name: '천둥폭풍', description: 'E키로 모든 적에게 피해', stat: 'special', value: 'thunderstorm' },
            { name: '번개 속도', description: '총알 속도 +80%', stat: 'bulletSpeed', value: 0.8 },
            { name: '전기 충격', description: '연쇄 데미지 +20%', stat: 'chainDamage', value: 0.2 },
            { name: '광속 이동', description: '이동속도 +25%', stat: 'speed', value: 0.25 }
        ]
    },
    // 암흑 마법 스킬
    DARK: {
        base: { name: '암흑 마법 마스터', description: '암흑 마법 해제', magicType: 'DARK' },
        upgrades: [
            { name: '어둠의 인력', description: '끌어당기는 힘 +50%', stat: 'pullForce', value: 0.5 },
            { name: '공허의 데미지', description: '데미지 +40%', stat: 'damage', value: 0.4 },
            { name: '암흑 영역', description: 'E키로 5개의 암흑 동그라미 생성', stat: 'special', value: 'darkvoid' },
            { name: '영혼 흡수', description: '적 처치 시 체력 +10 회복', stat: 'lifesteal', value: 10 },
            { name: '그림자 속도', description: '시전속도 +35%', stat: 'fireRate', value: -0.35 },
            { name: '절망의 오라', description: '암흑 영역 지속시간 +2초', stat: 'voidDuration', value: 2 }
        ]
    }
};

// 플레이어 스킬 상태
let playerSkills = {
    unlockedMagic: [], // 해제된 마법들
    currentMagic: null, // 현재 사용 중인 마법
    skillUpgrades: {
        STATS: 0,
        FIRE: 0,
        ICE: 0,
        LIGHTNING: 0,
        DARK: 0
    },
    // 플레이어 능력치
    stats: {
        healthRegen: 0,
        maxHealthBonus: 0,
        speedBonus: 0,
        totalAmmoBonus: 0,
        burnDamage: 1,
        slowEffect: 1,
        chainRange: 1,
        bulletSpeedBonus: 0,
        chainDamage: 0,
        pullForce: 1,
        lifesteal: 0,
        voidDuration: 0
    },
    // 특수 스킬들
    specialSkills: {
        fireball: false,
        blizzard: false,
        thunderstorm: false,
        darkvoid: false
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
        this.lastSpecialSkill = 0;
        this.specialSkillCooldown = 10000; // 10초 쿨다운
        this.lastHealthRegen = 0;
        
        // 기본 무기 설정 (마법이 없을 때)
        this.weapon = {
            type: 'basic',
            damage: 20,
            fireRate: 200,
            maxAmmo: 30,
            reloadTime: 2000,
            accuracy: 0.9,
            range: 270, // 1.5배 증가
            ammo: 30,
            totalAmmo: 120,
            lastReload: 0,
            isReloading: false,
            lastShot: 0
        };
        
        this.updateStats();
    }

    updateStats() {
        // 스탯 강화 적용
        let statsLevel = playerSkills.skillUpgrades.STATS;
        
        // 최대 체력 업데이트
        this.maxHealth = 100 + playerSkills.stats.maxHealthBonus;
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }

        // 현재 마법이 있으면 마법 스탯 적용
        if (playerSkills.currentMagic) {
            let magicType = MAGIC_TYPES[playerSkills.currentMagic];
            let upgradeLevel = playerSkills.skillUpgrades[playerSkills.currentMagic];
            let skillData = SKILL_TREE[playerSkills.currentMagic];
            
            // 기본 마법 스탯
            this.weapon = {
                type: playerSkills.currentMagic,
                damage: magicType.damage,
                fireRate: magicType.fireRate,
                maxAmmo: magicType.maxAmmo,
                reloadTime: magicType.reloadTime,
                accuracy: magicType.accuracy,
                range: magicType.range,
                element: magicType.element,
                ammo: this.weapon.ammo || magicType.maxAmmo,
                totalAmmo: Math.floor(magicType.maxAmmo * 4 * (1 + playerSkills.stats.totalAmmoBonus)),
                lastReload: this.weapon.lastReload || 0,
                isReloading: this.weapon.isReloading || false,
                lastShot: this.weapon.lastShot || 0
            };

            // 업그레이드 적용
            for (let i = 0; i < upgradeLevel; i++) {
                let upgrade = skillData.upgrades[i];
                if (upgrade.stat === 'reloadTime' || upgrade.stat === 'fireRate') {
                    this.weapon[upgrade.stat] *= (1 + upgrade.value);
                } else if (upgrade.stat === 'special') {
                    playerSkills.specialSkills[upgrade.value] = true;
                } else if (upgrade.stat === 'burnDamage' || upgrade.stat === 'slowEffect' || 
                          upgrade.stat === 'chainRange' || upgrade.stat === 'bulletSpeed') {
                    playerSkills.stats[upgrade.stat] += upgrade.value;
    } else {
                    this.weapon[upgrade.stat] *= (1 + upgrade.value);
                }
            }

            // 정수로 변환
            this.weapon.maxAmmo = Math.floor(this.weapon.maxAmmo);
            this.weapon.damage = Math.floor(this.weapon.damage);
            this.weapon.reloadTime = Math.floor(this.weapon.reloadTime);
            this.weapon.fireRate = Math.floor(this.weapon.fireRate);
            
            // 현재 탄약 조정
            this.weapon.ammo = Math.min(this.weapon.ammo, this.weapon.maxAmmo);
        }
    }

    update() {
        // 이동속도에 스탯 보너스 적용
        let baseSpeed = this.isRunning ? GAME_CONFIG.PLAYER_RUN_SPEED : GAME_CONFIG.PLAYER_SPEED;
        let speed = baseSpeed * (1 + playerSkills.stats.speedBonus);
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

        // 체력 재생
        if (playerSkills.stats.healthRegen > 0 && Date.now() - this.lastHealthRegen > 1000) {
            this.health = Math.min(this.maxHealth, this.health + playerSkills.stats.healthRegen);
            this.lastHealthRegen = Date.now();
        }

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

            // 마법 총알 생성
            let spread = (Math.random() - 0.5) * (1 - this.weapon.accuracy) * 0.2;
            bullets.push(new Bullet(
                this.x + Math.cos(this.angle) * this.size,
                this.y + Math.sin(this.angle) * this.size,
                this.angle + spread,
                'player',
                this.weapon.damage,
                this.weapon.range,
                this.weapon.type || 'basic'
            ));

            createMuzzleFlash(this.x, this.y, this.angle, this.weapon.type || 'basic');
            
            // 탄약이 다 떨어지면 자동 재장전
            if (this.weapon.ammo === 0 && this.weapon.totalAmmo > 0) {
                this.reload();
            }
        }
    }

    // 특수 스킬 사용
    useSpecialSkill() {
        if (Date.now() - this.lastSpecialSkill < this.specialSkillCooldown) {
            return; // 쿨다운 중
        }

        if (playerSkills.specialSkills.fireball && playerSkills.currentMagic === 'FIRE') {
            this.castFireball();
            this.lastSpecialSkill = Date.now();
        } else if (playerSkills.specialSkills.blizzard && playerSkills.currentMagic === 'ICE') {
            this.castBlizzard();
            this.lastSpecialSkill = Date.now();
        } else if (playerSkills.specialSkills.thunderstorm && playerSkills.currentMagic === 'LIGHTNING') {
            this.castThunderstorm();
            this.lastSpecialSkill = Date.now();
        } else if (playerSkills.specialSkills.darkvoid && playerSkills.currentMagic === 'DARK') {
            this.castDarkVoid();
            this.lastSpecialSkill = Date.now();
        }
    }
    
    // 🔥 파이어볼 시전 (더 화려하게!)
    castFireball() {
        // 5개의 파이어볼을 부채꼴로 발사
        for (let i = 0; i < 5; i++) {
            const spreadAngle = (i - 2) * 0.3; // -0.6 ~ 0.6 라디안 스프레드
            const fireball = new FireballProjectile(
                this.x + Math.cos(this.angle + spreadAngle) * 30,
                this.y + Math.sin(this.angle + spreadAngle) * 30,
                this.angle + spreadAngle
            );
            fireballProjectiles.push(fireball);
        }
        
        // 시전 이펙트
        for (let i = 0; i < 20; i++) {
            particles.push(new Particle(
                this.x + (Math.random() - 0.5) * 40,
                this.y + (Math.random() - 0.5) * 40,
                ['#FF4500', '#FF6347', '#FFD700'][Math.floor(Math.random() * 3)],
                Math.random() * 8 + 4,
                {
                    x: (Math.random() - 0.5) * 8,
                    y: (Math.random() - 0.5) * 8
                }
            ));
        }
    }
    
    // ❄️ 블리자드 시전 (더 화려하게!)
    castBlizzard() {
        // 모든 적들을 얼리고 화면 전체에 눈보라 이펙트
        enemies.forEach(enemy => {
            enemy.slowDuration = Date.now() + 5000; // 5초간 빙결
            enemy.slowEffect = 0.2; // 80% 속도 감소
            
            // 각 적 주위에 얼음 파티클
            for (let i = 0; i < 15; i++) {
                particles.push(new Particle(
                    enemy.x + (Math.random() - 0.5) * 60,
                    enemy.y + (Math.random() - 0.5) * 60,
                    ['#87CEEB', '#B0E0E6', '#E0FFFF'][Math.floor(Math.random() * 3)],
                    Math.random() * 6 + 3,
                    {
                        x: (Math.random() - 0.5) * 3,
                        y: (Math.random() - 0.5) * 3
                    }
                ));
            }
        });
        
        // 화면 전체 눈보라 효과
        for (let i = 0; i < 200; i++) {
            particles.push(new Particle(
                camera.x + Math.random() * GAME_CONFIG.CANVAS_WIDTH,
                camera.y + Math.random() * GAME_CONFIG.CANVAS_HEIGHT,
                ['#FFFFFF', '#E6F3FF', '#CCE7FF'][Math.floor(Math.random() * 3)],
                Math.random() * 4 + 2,
                {
                    x: (Math.random() - 0.5) * 6,
                    y: Math.random() * 4 + 2
                }
            ));
        }
    }
    
    // ⚡ 천둥폭풍 시전 (더 화려하게!)
    castThunderstorm() {
        // 모든 적에게 번개 효과와 20% 데미지
        enemies.forEach(enemy => {
            enemy.takeDamage(Math.floor(enemy.maxHealth * 0.2));
            
            // 각 적에게 번개 이펙트
            for (let i = 0; i < 10; i++) {
                particles.push(new Particle(
                    enemy.x + (Math.random() - 0.5) * 50,
                    enemy.y + (Math.random() - 0.5) * 50,
                    ['#FFD700', '#FFFF00', '#FFF8DC'][Math.floor(Math.random() * 3)],
                    Math.random() * 8 + 4,
                    {
                        x: (Math.random() - 0.5) * 10,
                        y: (Math.random() - 0.5) * 10
                    }
                ));
            }
        });
        
        // 하늘에서 내리치는 번개 효과
        for (let i = 0; i < 30; i++) {
            const x = camera.x + Math.random() * GAME_CONFIG.CANVAS_WIDTH;
            const y = camera.y + Math.random() * GAME_CONFIG.CANVAS_HEIGHT;
            
            particles.push(new Particle(
                x, y,
                '#FFFF00',
                Math.random() * 12 + 8,
                {
                    x: (Math.random() - 0.5) * 4,
                    y: Math.random() * 8 + 4
                }
            ));
        }
    }
    
    // 🌑 암흑 영역 시전 (새로운 스킬!)
    castDarkVoid() {
        // 플레이어 주변 5개 위치에 암흑 영역 생성
        const radius = 150;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const voidX = this.x + Math.cos(angle) * radius;
            const voidY = this.y + Math.sin(angle) * radius;
            
            darkVoids.push(new DarkVoid(voidX, voidY, 3 + playerSkills.stats.voidDuration));
        }
        
        // 시전 이펙트
        for (let i = 0; i < 50; i++) {
            particles.push(new Particle(
                this.x + (Math.random() - 0.5) * 80,
                this.y + (Math.random() - 0.5) * 80,
                ['#8A2BE2', '#4B0082', '#000000'][Math.floor(Math.random() * 3)],
                Math.random() * 10 + 5,
                {
                    x: (Math.random() - 0.5) * 6,
                    y: (Math.random() - 0.5) * 6
                }
            ));
        }
    }

    castFireball() {
        this.lastSpecialSkill = Date.now();
        
        // 파이어볼 생성 (폭발하는 투사체)
        particles.push(new FireballProjectile(
            this.x + Math.cos(this.angle) * this.size,
            this.y + Math.sin(this.angle) * this.size,
            this.angle
        ));
    }

    castBlizzard() {
        this.lastSpecialSkill = Date.now();
        
        // 모든 적을 빙결
        enemies.forEach(enemy => {
            enemy.slowEffect = Math.max(enemy.slowEffect || 1, 0.3); // 70% 속도 감소
            enemy.slowDuration = Date.now() + 5000; // 5초간 지속
        });
        
        // 블리자드 파티클 효과 (화면 전체)
        for (let i = 0; i < 100; i++) {
            particles.push(new Particle(
                camera.x + Math.random() * GAME_CONFIG.CANVAS_WIDTH,
                camera.y + Math.random() * GAME_CONFIG.CANVAS_HEIGHT,
                Math.random() > 0.5 ? '#87CEEB' : '#FFFFFF',
                Math.random() * 4 + 2,
                { 
                    x: (Math.random() - 0.5) * 2, 
                    y: Math.random() * 3 + 2 
                }
            ));
        }
        
        // 빙결된 적들에게 시각 효과
        enemies.forEach(enemy => {
            if (enemy.slowDuration && Date.now() < enemy.slowDuration) {
                for (let i = 0; i < 3; i++) {
                    particles.push(new Particle(
                        enemy.x + (Math.random() - 0.5) * 40,
                        enemy.y + (Math.random() - 0.5) * 40,
                        '#87CEEB',
                        Math.random() * 3 + 1,
                        {
                            x: (Math.random() - 0.5) * 2,
                            y: -(Math.random() * 2 + 1)
                        }
                    ));
                }
            }
        });
    }

    castThunderstorm() {
        this.lastSpecialSkill = Date.now();
        
        // 모든 적에게 20% 데미지
        enemies.forEach(enemy => {
            enemy.takeDamage(enemy.maxHealth * 0.2);
            
            // 번개 파티클 효과
            for (let i = 0; i < 5; i++) {
                particles.push(new Particle(
                    enemy.x + (Math.random() - 0.5) * 30,
                    enemy.y + (Math.random() - 0.5) * 30,
                    '#FFD700',
                    Math.random() * 4 + 2,
                    {
                        x: (Math.random() - 0.5) * 4,
                        y: (Math.random() - 0.5) * 4
                    }
                ));
            }
        });
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
        
        // 장전 중일 때 캐릭터 위에 로딩 바 표시
        if (this.weapon.isReloading) {
            this.drawReloadBar();
        }
    }
    
    // 캐릭터 위 장전 바 그리기
    drawReloadBar() {
        const barWidth = 40;
        const barHeight = 6;
        const barX = this.x - camera.x - barWidth / 2;
        const barY = this.y - camera.y - this.size - 15;
        
        const reloadProgress = Math.min(1, (Date.now() - this.weapon.lastReload) / this.weapon.reloadTime);
        
        // 배경
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // 진행 바
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(barX, barY, barWidth * reloadProgress, barHeight);
        
        // 테두리
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // 텍스트
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('장전중', this.x - camera.x, barY - 3);
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
        // 화상 데미지 처리
        if (this.burnDuration && Date.now() < this.burnDuration) {
            if (!this.lastBurnTick || Date.now() - this.lastBurnTick > 1000) {
                this.takeDamage(this.burnDamage || 5);
                this.lastBurnTick = Date.now();
            }
        }
        
        // 암흑 데미지 처리
        if (this.darkDamage && Date.now() < this.darkDamage) {
            if (!this.lastDarkTick || Date.now() - this.lastDarkTick > 1000) {
                this.takeDamage(this.darkDamageAmount || 3);
                this.lastDarkTick = Date.now();
            }
        }

        // 이동속도에 빙결 효과 적용
        let speedMultiplier = 1;
        if (this.slowDuration && Date.now() < this.slowDuration) {
            speedMultiplier = this.slowEffect || 0.5;
        }

        let dx = player.x - this.x;
        let dy = player.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.detectionRange) {
            this.angle = Math.atan2(dy, dx);
            
            if (distance > 30) {
                this.x += Math.cos(this.angle) * GAME_CONFIG.ENEMY_SPEED * speedMultiplier;
                this.y += Math.sin(this.angle) * GAME_CONFIG.ENEMY_SPEED * speedMultiplier;
            }

            if (distance < this.shootRange && Date.now() - this.lastShot > this.fireRate) {
                this.shoot();
            }
        } else {
            this.angle += (Math.random() - 0.5) * 0.2;
            this.x += Math.cos(this.angle) * GAME_CONFIG.ENEMY_SPEED * 0.3 * speedMultiplier;
            this.y += Math.sin(this.angle) * GAME_CONFIG.ENEMY_SPEED * 0.3 * speedMultiplier;
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
            12.5, // 데미지 절반으로 감소
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
        // 총알 속도에 플레이어 보너스 적용
        let speedMultiplier = 1 + (playerSkills.stats.bulletSpeedBonus || 0);
        
        switch(this.weaponType) {
            case 'FIRE':
                this.speed = GAME_CONFIG.BULLET_SPEED * speedMultiplier;
                this.size = GAME_CONFIG.BULLET_SIZE + 1;
                this.color = '#FF4444'; // 빨간색
                this.element = 'fire';
                break;
            case 'ICE':
                this.speed = GAME_CONFIG.BULLET_SPEED * 0.9 * speedMultiplier;
                this.size = GAME_CONFIG.BULLET_SIZE + 1;
                this.color = '#87CEEB'; // 하늘색
                this.element = 'ice';
                break;
            case 'LIGHTNING':
                this.speed = GAME_CONFIG.BULLET_SPEED * 1.3 * speedMultiplier;
                this.size = GAME_CONFIG.BULLET_SIZE + 2;
                this.color = '#FFD700'; // 금색
                this.element = 'lightning';
                break;
            default: // 기본 무기
                if (this.owner === 'enemy') {
                    this.speed = GAME_CONFIG.BULLET_SPEED * 0.8; // 적 총알은 20% 느리게
                } else {
                    this.speed = GAME_CONFIG.BULLET_SPEED * speedMultiplier;
                }
                this.size = GAME_CONFIG.BULLET_SIZE;
                this.color = this.owner === 'player' ? '#FFFFFF' : '#FF6666'; // 플레이어는 흰색, 적은 연한 빨간색
                this.element = 'basic';
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

// 암흑 오브 클래스 (검은 점)
class DarkOrb {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 8;
        this.life = 0.8; // 0.8초
        this.maxLife = 0.8;
        this.createdAt = Date.now();
        this.pulseSpeed = 5;
        this.alpha = 1;
    }
    
    update() {
        const elapsed = (Date.now() - this.createdAt) / 1000;
        this.life = this.maxLife - elapsed;
        this.alpha = Math.max(0, this.life / this.maxLife);
        return this.life <= 0;
    }
    
    draw() {
        const pulse = Math.sin(Date.now() * this.pulseSpeed / 1000) * 0.3 + 0.7;
        const currentSize = this.size * pulse;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        // 외부 어두운 원
        ctx.fillStyle = '#1a0d1a';
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, currentSize + 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 내부 검은 원
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
        
        // 중앙 보라색 점
        ctx.fillStyle = '#8A2BE2';
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, currentSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// 암흑 영역 클래스 (5개의 동그라미)
class DarkVoid {
    constructor(x, y, duration) {
        this.x = x;
        this.y = y;
        this.duration = duration;
        this.maxDuration = duration;
        this.createdAt = Date.now();
        this.radius = 60;
        this.damageInterval = 1000; // 1초마다 데미지
        this.lastDamage = 0;
    }
    
    update() {
        const elapsed = (Date.now() - this.createdAt) / 1000;
        this.duration = this.maxDuration - elapsed;
        
        // 영역 안의 적들에게 데미지
        if (Date.now() - this.lastDamage > this.damageInterval) {
            enemies.forEach(enemy => {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.radius) {
                    enemy.takeDamage(15);
                    
                    // 암흑 파티클 효과
                    for (let i = 0; i < 5; i++) {
                        particles.push(new Particle(
                            enemy.x + (Math.random() - 0.5) * 20,
                            enemy.y + (Math.random() - 0.5) * 20,
                            '#8A2BE2',
                            Math.random() * 4 + 2,
                            {
                                x: (Math.random() - 0.5) * 3,
                                y: (Math.random() - 0.5) * 3
                            }
                        ));
                    }
                }
            });
            this.lastDamage = Date.now();
        }
        
        return this.duration <= 0;
    }
    
    draw() {
        const alpha = Math.max(0, this.duration / this.maxDuration);
        const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
        
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        
        // 외부 어두운 원
        ctx.fillStyle = '#1a0d1a';
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // 내부 보라색 원
        ctx.fillStyle = '#4B0082';
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius * pulse * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // 중앙 암흑 원
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius * pulse * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // 가장자리 효과
        ctx.strokeStyle = '#8A2BE2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius * pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}

// 파이어볼 투사체 클래스
class FireballProjectile {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 8;
        this.size = 15;
        this.life = 200; // 이동 거리
        this.exploded = false;
    }
    
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life--;
        
        // 적과 충돌 확인
        for (let enemy of enemies) {
            const dx = this.x - enemy.x;
            const dy = this.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.size + enemy.size) {
                this.explode();
                return true;
            }
        }
        
        if (this.life <= 0) {
            this.explode();
            return true;
        }
        
        return false;
    }
    
    explode() {
        if (this.exploded) return;
        this.exploded = true;
        
        // 폭발 링 생성
        explosionRings.push(new ExplosionRing(this.x, this.y, 80));
        
        // 범위 내 적들에게 데미지와 화상 효과
        enemies.forEach(enemy => {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 80) {
                enemy.takeDamage(50);
                enemy.burnDuration = Date.now() + 4000; // 4초간 화상
                enemy.burnDamage = 8;
            }
        });
        
        // 폭발 파티클
        for (let i = 0; i < 30; i++) {
            particles.push(new Particle(
                this.x + (Math.random() - 0.5) * 60,
                this.y + (Math.random() - 0.5) * 60,
                ['#FF4500', '#FF6347', '#FFD700', '#FF8C00'][Math.floor(Math.random() * 4)],
                Math.random() * 12 + 6,
                {
                    x: (Math.random() - 0.5) * 15,
                    y: (Math.random() - 0.5) * 15
                }
            ));
        }
    }
    
    draw() {
        // 파이어볼 그리기
        ctx.save();
        
        // 외부 불꽃
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // 내부 불꽃
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // 중앙 밝은 점
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// 폭발 링 클래스
class ExplosionRing {
    constructor(x, y, maxRadius) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = maxRadius;
        this.life = 1.0;
        this.decay = 0.05;
    }
    
    update() {
        this.radius += (this.maxRadius - this.radius) * 0.3;
        this.life -= this.decay;
        return this.life <= 0;
    }
    
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.strokeStyle = '#FF4500';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
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

// 마법 효과 적용
function applyMagicEffect(bullet, enemy) {
    if (bullet.owner !== 'player') return;
    
    switch(bullet.element) {
        case 'fire':
            // 화상 효과
            enemy.burnDamage = 5 * playerSkills.stats.burnDamage;
            enemy.burnDuration = Date.now() + 3000; // 3초간 지속
            break;
            
        case 'ice':
            // 빙결 효과
            enemy.slowEffect = 0.5 * playerSkills.stats.slowEffect;
            enemy.slowDuration = Date.now() + 2000; // 2초간 지속
            break;
            
        case 'lightning':
            // 연쇄 번개
            chainLightning(enemy.x, enemy.y, bullet.damage);
            break;
    }
}

// 연쇄 번개 효과
function chainLightning(x, y, damage) {
    let chainCount = 0;
    let maxChains = 2;
    let chainRange = 200 * playerSkills.stats.chainRange; // 범위 확대 (2x2 화면 크기)
    let chainTargets = [];
    
    enemies.forEach(enemy => {
        if (chainCount >= maxChains) return;
        
        let distance = Math.sqrt((enemy.x - x) ** 2 + (enemy.y - y) ** 2);
        if (distance <= chainRange && distance > 0) {
            enemy.takeDamage(damage * 0.3); // 30% 데미지
            chainTargets.push({x: enemy.x, y: enemy.y});
            chainCount++;
            
            // 번개 파티클 효과
            for (let i = 0; i < 5; i++) {
                particles.push(new Particle(
                    enemy.x + (Math.random() - 0.5) * 30,
                    enemy.y + (Math.random() - 0.5) * 30,
                    '#FFD700',
                    Math.random() * 4 + 2,
                    {
                        x: (Math.random() - 0.5) * 4,
                        y: (Math.random() - 0.5) * 4
                    }
                ));
            }
        }
    });
    
    // 연쇄 번개 시각 효과 (노란 선)
    if (chainTargets.length > 0) {
        particles.push(new LightningChain(x, y, chainTargets));
    }
}

// 번개 연쇄 시각 효과 클래스
class LightningChain {
    constructor(startX, startY, targets) {
        this.startX = startX;
        this.startY = startY;
        this.targets = targets;
        this.life = 1.0;
        this.decay = 0.1; // 빠르게 사라짐
        this.segments = [];
        
        // 각 타겟까지의 번개 경로 생성
        this.targets.forEach(target => {
            this.segments.push(this.generateLightningPath(startX, startY, target.x, target.y));
        });
    }
    
    generateLightningPath(x1, y1, x2, y2) {
        let segments = [];
        let steps = 8; // 번개 세그먼트 수
        
        for (let i = 0; i <= steps; i++) {
            let t = i / steps;
            let x = x1 + (x2 - x1) * t;
            let y = y1 + (y2 - y1) * t;
            
            // 번개처럼 지그재그 효과
            if (i > 0 && i < steps) {
                x += (Math.random() - 0.5) * 20;
                y += (Math.random() - 0.5) * 20;
            }
            
            segments.push({x, y});
        }
        
        return segments;
    }
    
    update() {
        this.life -= this.decay;
        return this.life <= 0;
    }
    
    draw() {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 5;
        
        this.segments.forEach(path => {
            ctx.beginPath();
            for (let i = 0; i < path.length; i++) {
                let point = path[i];
                if (i === 0) {
                    ctx.moveTo(point.x - camera.x, point.y - camera.y);
                } else {
                    ctx.lineTo(point.x - camera.x, point.y - camera.y);
                }
            }
            ctx.stroke();
        });
        
        ctx.restore();
    }
}

// 파이어볼 프로젝타일 클래스
class FireballProjectile {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 8;
        this.size = 15;
        this.life = 1.0;
        this.decay = 0.01;
        this.maxDistance = 300;
        this.distanceTraveled = 0;
        this.startX = x;
        this.startY = y;
    }
    
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        this.distanceTraveled = Math.sqrt(
            Math.pow(this.x - this.startX, 2) + Math.pow(this.y - this.startY, 2)
        );
        
        this.life -= this.decay;
        
        // 최대 거리에 도달하거나 적과 충돌하면 폭발
        if (this.distanceTraveled >= this.maxDistance || this.life <= 0) {
            this.explode();
            return true;
        }
        
        // 적과 충돌 체크
        for (let enemy of enemies) {
            let dx = this.x - enemy.x;
            let dy = this.y - enemy.y;
            if (Math.sqrt(dx * dx + dy * dy) < this.size + enemy.size) {
                this.explode();
                return true;
            }
        }
        
        return false;
    }
    
    explode() {
        let explosionRadius = 100;
        
        // 폭발 범위 내 모든 적에게 데미지
        enemies.forEach(enemy => {
            let distance = Math.sqrt(
                Math.pow(enemy.x - this.x, 2) + Math.pow(enemy.y - this.y, 2)
            );
            
            if (distance <= explosionRadius) {
                let damage = 60 * (1 - distance / explosionRadius); // 거리에 따른 데미지 감소
                enemy.takeDamage(damage);
                
                // 화상 효과 적용
                enemy.burnDamage = 8 * playerSkills.stats.burnDamage;
                enemy.burnDuration = Date.now() + 4000; // 4초간 지속
            }
        });
        
        // 폭발 파티클 효과
        for (let i = 0; i < 20; i++) {
            particles.push(new Particle(
                this.x + (Math.random() - 0.5) * explosionRadius,
                this.y + (Math.random() - 0.5) * explosionRadius,
                Math.random() > 0.5 ? '#FF4444' : '#FFA500',
                Math.random() * 8 + 4,
                {
                    x: (Math.random() - 0.5) * 8,
                    y: (Math.random() - 0.5) * 8
                }
            ));
        }
        
        // 폭발 원형 효과
        particles.push(new ExplosionRing(this.x, this.y, explosionRadius));
    }
    
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        
        // 파이어볼 본체
        ctx.fillStyle = '#FF4444';
        ctx.shadowColor = '#FF4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // 내부 불꽃
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// 폭발 원형 효과 클래스
class ExplosionRing {
    constructor(x, y, maxRadius) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = maxRadius;
        this.life = 1.0;
        this.decay = 0.05;
        this.expandSpeed = 8;
    }
    
    update() {
        this.radius += this.expandSpeed;
        this.life -= this.decay;
        return this.life <= 0 || this.radius > this.maxRadius;
    }
    
    draw() {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.strokeStyle = '#FF4444';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#FF4444';
        ctx.shadowBlur = 8;
        
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
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
        if (e.key.toLowerCase() === 'e' && gameState === 'playing') {
            player.useSpecialSkill();
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
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    
    console.log('시작 버튼 요소:', startBtn);
    
    if (startBtn) {
        startBtn.addEventListener('click', startGame);
        console.log('시작 버튼 이벤트 리스너 등록됨');
    } else {
        console.error('시작 버튼을 찾을 수 없습니다!');
    }
    
    if (restartBtn) {
        restartBtn.addEventListener('click', restartGame);
    }
    
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
    console.log('게임 시작 버튼 클릭됨');
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
    darkOrbs = [];
    darkVoids = [];
    fireballProjectiles = [];
    explosionRings = [];
    
    // 스킬 초기화
    playerSkills = {
        unlockedMagic: [],
        currentMagic: null,
        skillUpgrades: {
            STATS: 0,
            FIRE: 0,
            ICE: 0,
            LIGHTNING: 0,
            DARK: 0
        },
        stats: {
            healthRegen: 0,
            maxHealthBonus: 0,
            speedBonus: 0,
            totalAmmoBonus: 0,
            burnDamage: 1,
            slowEffect: 1,
            chainRange: 1,
            bulletSpeedBonus: 0,
            chainDamage: 0,
            pullForce: 1,
            lifesteal: 0,
            voidDuration: 0
        },
        specialSkills: {
            fireball: false,
            blizzard: false,
            thunderstorm: false,
            darkvoid: false
        }
    };
    
    // 경험치와 레벨 초기화
    experience = 0;
    level = 1;
    skillPoints = 0;
    
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
                    
                    // 마법 효과 적용
                    if (bullet.element) {
                        applyMagicEffect(bullet, enemy);
                    }
                    
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
    
    // DarkOrb 업데이트
    for (let i = darkOrbs.length - 1; i >= 0; i--) {
        if (darkOrbs[i].update()) {
            darkOrbs.splice(i, 1);
        }
    }
    
    // DarkVoid 업데이트
    for (let i = darkVoids.length - 1; i >= 0; i--) {
        if (darkVoids[i].update()) {
            darkVoids.splice(i, 1);
        }
    }
    
    // FireballProjectile 업데이트
    for (let i = fireballProjectiles.length - 1; i >= 0; i--) {
        if (fireballProjectiles[i].update()) {
            fireballProjectiles.splice(i, 1);
        }
    }
    
    // ExplosionRing 업데이트
    for (let i = explosionRings.length - 1; i >= 0; i--) {
        if (explosionRings[i].update()) {
            explosionRings.splice(i, 1);
        }
    }

    if (enemies.length === 0) {
        gameState = 'gameOver';
    }

    updateUI();
}

// 마법 효과 적용 함수
function applyMagicEffect(bullet, enemy) {
    switch(bullet.element) {
        case 'fire':
            // 화상 효과
            enemy.burnDuration = Date.now() + 3000; // 3초간 화상
            enemy.burnDamage = Math.floor(bullet.damage * 0.2 * playerSkills.stats.burnDamage);
            break;
            
        case 'ice':
            // 빙결 효과
            enemy.slowDuration = Date.now() + 2000; // 2초간 빙결
            enemy.slowEffect = 0.5 * playerSkills.stats.slowEffect; // 50% 속도 감소
            break;
            
        case 'lightning':
            // 번개 연쇄 효과
            chainLightning(enemy.x, enemy.y, bullet.damage * (0.3 + playerSkills.stats.chainDamage));
            break;
            
        case 'dark':
            // 암흑 오브 생성
            darkOrbs.push(new DarkOrb(enemy.x, enemy.y));
            
            // 끌어당기기 효과 (0.5 네모칸 = 약 25px)
            const pullRange = 25 * playerSkills.stats.pullForce;
            enemies.forEach(nearbyEnemy => {
                if (nearbyEnemy !== enemy) {
                    const dx = nearbyEnemy.x - enemy.x;
                    const dy = nearbyEnemy.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < pullRange && distance > 0) {
                        // 끌어당기는 힘 적용
                        const pullStrength = 2 * playerSkills.stats.pullForce;
                        nearbyEnemy.x -= (dx / distance) * pullStrength;
                        nearbyEnemy.y -= (dy / distance) * pullStrength;
                        
                        // 끌려온 적에게 초당 데미지
                        nearbyEnemy.darkDamage = Date.now() + 500; // 0.5초간 지속
                        nearbyEnemy.darkDamageAmount = Math.floor(bullet.damage * 0.1);
                    }
                }
            });
            break;
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    // drawSafezone(); // 세이프존 원 제거
    
    // 배경 효과들 먼저 그리기
    darkVoids.forEach(void_ => void_.draw());
    explosionRings.forEach(ring => ring.draw());
    
    // 게임 오브젝트들
    enemies.forEach(enemy => enemy.draw());
    player.draw();
    bullets.forEach(bullet => bullet.draw());
    fireballProjectiles.forEach(fireball => fireball.draw());
    
    // 전경 효과들
    particles.forEach(particle => particle.draw());
    darkOrbs.forEach(orb => orb.draw());
    
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
    document.getElementById('currentWeapon').textContent = playerSkills.currentMagic ? MAGIC_TYPES[playerSkills.currentMagic].name : '기본 무기';
    document.getElementById('kills').textContent = kills;
    document.getElementById('survivors').textContent = survivors;

    // 경험치 UI 업데이트
    updateExpUI();
    
    // 스킬 쿨다운 UI 업데이트
    updateSkillCooldownUI();

    if (gameState === 'gameOver') {
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

// 스킬 쿨다운 UI 업데이트
function updateSkillCooldownUI() {
    const cooldownElement = document.getElementById('skillCooldown');
    const cooldownTimeElement = document.getElementById('cooldownTime');
    
    if (player && player.lastSpecialSkill) {
        const timeSinceSkill = Date.now() - player.lastSpecialSkill;
        const remainingCooldown = Math.max(0, player.specialSkillCooldown - timeSinceSkill);
        
        if (remainingCooldown > 0) {
            cooldownElement.classList.remove('hidden');
            cooldownTimeElement.textContent = Math.ceil(remainingCooldown / 1000);
        } else {
            cooldownElement.classList.add('hidden');
        }
    } else {
        cooldownElement.classList.add('hidden');
    }
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
    let activeSkill = document.querySelector('.weapon-tab.active').dataset.weapon;
    let skillData = SKILL_TREE[activeSkill];
    let content = document.getElementById('skillTreeContent');
    content.innerHTML = '';

    // 기본 스킬 해제
    let baseCategory = document.createElement('div');
    baseCategory.className = 'skill-category';
    baseCategory.innerHTML = activeSkill === 'STATS' ? `<h3>기본 능력</h3>` : `<h3>마법 해제</h3>`;
    
    let baseSkill = createSkillItem(skillData.base, activeSkill, -1);
    baseCategory.appendChild(baseSkill);
    content.appendChild(baseCategory);

    // 업그레이드 스킬들
    let isUnlocked = activeSkill === 'STATS' || playerSkills.unlockedMagic.includes(activeSkill);
    if (isUnlocked) {
        let upgradeCategory = document.createElement('div');
        upgradeCategory.className = 'skill-category';
        upgradeCategory.innerHTML = `<h3>스킬 강화</h3>`;
        
        skillData.upgrades.forEach((upgrade, index) => {
            let skillItem = createSkillItem(upgrade, activeSkill, index);
            upgradeCategory.appendChild(skillItem);
        });
        
        content.appendChild(upgradeCategory);
    }

    // 마법 변경 버튼 업데이트
    updateMagicSwitchButton(activeSkill);
}

function createSkillItem(skillData, skillType, upgradeIndex) {
    let isUnlocked = skillType === 'STATS' || playerSkills.unlockedMagic.includes(skillType);
    let upgradeLevel = playerSkills.skillUpgrades[skillType];
    let canPurchase = false;
    let isPurchased = false;

    if (upgradeIndex === -1) {
        // 기본 스킬
        if (skillType === 'STATS') {
            canPurchase = skillPoints > 0;
            isPurchased = true; // 스탯은 항상 해제되어 있음
        } else {
            canPurchase = !isUnlocked && skillPoints > 0;
            isPurchased = isUnlocked;
        }
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
                onclick="purchaseSkill('${skillType}', ${upgradeIndex})">
            ${buttonText}
        </button>
    `;

    return skillItem;
}

function purchaseSkill(skillType, upgradeIndex) {
    if (skillPoints <= 0) return;

    if (upgradeIndex === -1) {
        // 기본 스킬 해제
        if (skillType === 'STATS') {
            // 스탯 스킬은 항상 해제되어 있음
            skillPoints--;
        } else {
            // 마법 해제
            if (!playerSkills.unlockedMagic.includes(skillType)) {
                playerSkills.unlockedMagic.push(skillType);
                skillPoints--;
            }
        }
    } else {
        // 업그레이드 구매
        if (skillType === 'STATS' || playerSkills.unlockedMagic.includes(skillType)) {
            if (upgradeIndex === playerSkills.skillUpgrades[skillType]) {
                playerSkills.skillUpgrades[skillType]++;
                skillPoints--;
                
                // 스탯 업그레이드 적용
                applySkillUpgrade(skillType, upgradeIndex);
            }
        }
    }

    // 플레이어 스탯 업데이트
    player.updateStats();
    updateExpUI();
    buildSkillTree();
}

function applySkillUpgrade(skillType, upgradeIndex) {
    let skillData = SKILL_TREE[skillType];
    let upgrade = skillData.upgrades[upgradeIndex];
    
    switch(upgrade.stat) {
        case 'healthRegen':
            playerSkills.stats.healthRegen += upgrade.value;
            break;
        case 'maxHealth':
            playerSkills.stats.maxHealthBonus += upgrade.value;
            break;
        case 'speed':
            playerSkills.stats.speedBonus += upgrade.value;
            break;
        case 'totalAmmo':
            playerSkills.stats.totalAmmoBonus += upgrade.value;
            break;
        case 'special':
            playerSkills.specialSkills[upgrade.value] = true;
            break;
    }
}

function updateMagicSwitchButton(skillType) {
    let switchButton = document.getElementById('switchWeapon');
    
    if (skillType === 'STATS') {
        switchButton.classList.add('hidden');
        return;
    }
    
    let isUnlocked = playerSkills.unlockedMagic.includes(skillType);
    let isCurrent = skillType === playerSkills.currentMagic;

    if (isUnlocked && !isCurrent) {
        switchButton.classList.remove('hidden');
        switchButton.textContent = `${MAGIC_TYPES[skillType].name}으로 변경`;
        switchButton.onclick = () => switchMagic(skillType);
    } else {
        switchButton.classList.add('hidden');
    }
}

function switchMagic(magicType) {
    if (playerSkills.unlockedMagic.includes(magicType)) {
        playerSkills.currentMagic = magicType;
        player.updateStats();
        closeSkillTree();
    }
}

function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
    
    // 게임 초기 상태 설정
    gameState = 'menu';
    
    // 플레이어 초기화
    player = new Player(GAME_CONFIG.MAP_SIZE / 2, GAME_CONFIG.MAP_SIZE / 2);
    
    // 적들 초기화
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
    
    setupEventListeners();
}

console.log('스크립트 파일 로드됨');
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 로드 완료');
    initGame();
});
