// 몬스터 클래스
class Monster {
    constructor(type, x, y) {
        this.type = type;
        this.data = MONSTERS[type];
        this.name = this.data.이름;
        
        // 위치
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        
        // 능력치
        this.level = this.data.레벨;
        this.maxHP = this.data.HP;
        this.currentHP = this.maxHP;
        this.defense = this.data.방어력;
        this.magicResist = this.data.마법저항 || 0;
        this.attack = this.data.공격력;
        this.experience = this.data.경험치;
        this.goldRange = this.data.골드;
        
        // AI 관련
        this.aiType = this.data.AI;
        this.detectionRange = 200;
        this.attackRange = this.aiType === "원거리" ? 150 : 40;
        this.moveSpeed = 1.5;
        this.facing = 1;
        
        // 상태
        this.isActive = true;
        this.isDead = false;
        this.lastAttack = 0;
        this.attackCooldown = 1500;
        this.lastMove = 0;
        this.moveCooldown = 2000;
        
        // 이동 패턴
        this.patrolStart = x;
        this.patrolEnd = x + 200;
        this.patrolDirection = 1;
        this.targetPlayer = false;
        
        // 상태 효과
        this.statusEffects = [];
        
        // 물리
        this.velocityX = 0;
        this.velocityY = 0;
        this.onGround = true;
        
        // 애니메이션
        this.animationFrame = 0;
        this.animationTime = 0;
        
        // 특수 효과
        this.specialEffect = this.data.특수효과;
        
        // 리스폰 타이머
        this.respawnTimer = 0;
        this.respawnTime = 10000 + Math.random() * 5000; // 10-15초
    }
    
    update(deltaTime, player) {
        if (this.isDead) {
            this.updateRespawn(deltaTime);
            return;
        }
        
        // 상태 효과 업데이트
        this.updateStatusEffects(deltaTime);
        
        // AI 업데이트
        this.updateAI(deltaTime, player);
        
        // 물리 업데이트
        this.updatePhysics(deltaTime);
        
        // 애니메이션 업데이트
        this.updateAnimation(deltaTime);
    }
    
    updateStatusEffects(deltaTime) {
        for (let i = this.statusEffects.length - 1; i >= 0; i--) {
            const effect = this.statusEffects[i];
            effect.duration -= deltaTime;
            
            // 효과 적용
            if (effect.type === "화상" && effect.nextTick <= 0) {
                this.takeDamage(effect.damage, "fire");
                effect.nextTick = 1000; // 1초마다
            }
            
            effect.nextTick -= deltaTime;
            
            // 지속시간 종료 시 제거
            if (effect.duration <= 0) {
                this.statusEffects.splice(i, 1);
            }
        }
    }
    
    updateAI(deltaTime, player) {
        if (this.hasStatusEffect("기절") || this.hasStatusEffect("빙결")) {
            this.velocityX = 0;
            return;
        }
        
        const distanceToPlayer = this.getDistanceToPlayer(player);
        const now = Date.now();
        
        // 플레이어 감지
        if (distanceToPlayer <= this.detectionRange) {
            this.targetPlayer = true;
        } else if (distanceToPlayer > this.detectionRange * 1.5) {
            this.targetPlayer = false;
        }
        
        if (this.targetPlayer) {
            // 플레이어 추적 및 공격
            this.updateCombatAI(deltaTime, player, distanceToPlayer, now);
        } else {
            // 순찰 모드
            this.updatePatrolAI(deltaTime, now);
        }
    }
    
    updateCombatAI(deltaTime, player, distance, now) {
        // 공격 범위 확인
        if (distance <= this.attackRange && now - this.lastAttack >= this.attackCooldown) {
            this.attackPlayer(player);
            this.lastAttack = now;
        } else if (distance > this.attackRange) {
            // 플레이어에게 이동
            const dx = player.x - this.x;
            if (Math.abs(dx) > 10) {
                this.facing = dx > 0 ? 1 : -1;
                let speed = this.moveSpeed;
                
                // 둔화 효과 적용
                if (this.hasStatusEffect("둔화")) {
                    speed *= 0.7;
                }
                
                this.velocityX = this.facing * speed;
            } else {
                this.velocityX = 0;
            }
        } else {
            this.velocityX = 0;
        }
    }
    
    updatePatrolAI(deltaTime, now) {
        if (now - this.lastMove >= this.moveCooldown) {
            // 순찰 이동
            if (this.x <= this.patrolStart) {
                this.patrolDirection = 1;
            } else if (this.x >= this.patrolEnd) {
                this.patrolDirection = -1;
            }
            
            this.facing = this.patrolDirection;
            let speed = this.moveSpeed * 0.5; // 순찰 시에는 느리게
            
            if (this.hasStatusEffect("둔화")) {
                speed *= 0.7;
            }
            
            this.velocityX = this.patrolDirection * speed;
            
            // 가끔 멈춤
            if (Math.random() < 0.3) {
                this.velocityX = 0;
                this.lastMove = now + Math.random() * 1000; // 추가 대기
            }
        } else {
            this.velocityX = 0;
        }
    }
    
    updatePhysics(deltaTime) {
        // 위치 업데이트
        this.x += this.velocityX;
        
        // 간단한 지면 충돌
        const groundY = 650;
        if (this.y + this.height >= groundY) {
            this.y = groundY - this.height;
            this.onGround = true;
        }
        
        // 맵 경계 제한
        this.x = Math.max(0, Math.min(GAME_CONFIG.CANVAS_WIDTH - this.width, this.x));
    }
    
    updateAnimation(deltaTime) {
        this.animationTime += deltaTime;
        
        if (this.animationTime >= 500) {
            this.animationFrame = (this.animationFrame + 1) % 4;
            this.animationTime = 0;
        }
    }
    
    updateRespawn(deltaTime) {
        this.respawnTimer += deltaTime;
        if (this.respawnTimer >= this.respawnTime) {
            this.respawn();
        }
    }
    
    attackPlayer(player) {
        let damage = this.attack;
        
        // 특수 효과 적용
        if (this.specialEffect === "둔화") {
            player.addStatusEffect({
                type: "둔화",
                duration: 2000
            });
        }
        
        // 데미지 변동 (90-110%)
        damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
        
        const finalDamage = player.takeDamage(damage, "physical");
        
        // 공격 애니메이션/이펙트
        this.createAttackEffect();
    }
    
    takeDamage(amount, type = "physical") {
        console.log(`${this.name} takeDamage 호출됨:`, {
            amount: amount,
            type: type,
            isDead: this.isDead,
            currentHP: this.currentHP,
            defense: this.defense
        });
        
        if (this.isDead) {
            console.log("몬스터가 이미 죽어서 데미지 무시");
            return 0;
        }
        
        let finalDamage = amount;
        
        // 방어력/마법저항 적용
        if (type === "physical") {
            finalDamage = Math.max(1, amount - this.defense);
        } else if (type === "magic") {
            finalDamage = Math.max(1, amount - this.magicResist);
        }
        
        console.log(`${this.name} 최종 데미지:`, finalDamage, "기존 HP:", this.currentHP);
        
        this.currentHP = Math.max(0, this.currentHP - finalDamage);
        
        console.log(`${this.name} 새로운 HP:`, this.currentHP);
        
        // 피격 이펙트
        this.createHitEffect();
        
        // 사망 확인
        if (this.currentHP <= 0) {
            console.log(`${this.name} 사망!`);
            this.die();
        }
        
        return finalDamage;
    }
    
    die() {
        this.isDead = true;
        this.velocityX = 0;
        
        // 경험치 지급
        const player = game.player;
        player.gainExperience(this.experience);
        
        // 골드 드랍
        const goldAmount = Math.floor(this.goldRange[0] + Math.random() * (this.goldRange[1] - this.goldRange[0] + 1));
        player.addGold(goldAmount);
        
        // 아이템 드랍
        this.dropItems(player);
        
        game.addCombatLog(`${this.name} 처치!`, "exp");
    }
    
    dropItems(player) {
        for (let drop of this.data.드랍) {
            if (Math.random() * 100 < drop.확률) {
                if (drop.아이템 === "골드") continue; // 이미 처리됨
                
                // 인벤토리에 아이템 추가
                if (!player.inventory.consumables[drop.아이템]) {
                    player.inventory.consumables[drop.아이템] = 0;
                }
                player.inventory.consumables[drop.아이템]++;
                
                game.addCombatLog(`${drop.아이템} 획득!`, "gold");
            }
        }
    }
    
    respawn() {
        this.isDead = false;
        this.currentHP = this.maxHP;
        this.respawnTimer = 0;
        this.statusEffects = [];
        this.targetPlayer = false;
        
        // 원래 위치 근처에서 리스폰
        this.x = this.patrolStart + Math.random() * (this.patrolEnd - this.patrolStart);
        this.y = 650 - this.height;
    }
    
    getDistanceToPlayer(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    hasStatusEffect(type) {
        return this.statusEffects.some(effect => effect.type === type);
    }
    
    addStatusEffect(effect) {
        // 같은 타입의 기존 효과 제거
        this.statusEffects = this.statusEffects.filter(e => e.type !== effect.type);
        this.statusEffects.push(effect);
    }
    
    createAttackEffect() {
        // 공격 이펙트 생성 (나중에 구현)
    }
    
    createHitEffect() {
        // 피격 이펙트 생성 (나중에 구현)
    }
    
    draw(ctx) {
        if (this.isDead) return;
        
        // 고양이 몬스터 그리기
        this.drawEnemyCat(ctx);
        
        // HP바 그리기
        this.drawHealthBar(ctx);
        
        // 상태 효과 표시
        this.drawStatusEffects(ctx);
        
        // 레벨 표시
        ctx.font = "10px monospace";
        ctx.fillStyle = "#ffff00";
        ctx.textAlign = "center";
        ctx.fillText(`Lv.${this.level}`, this.x + this.width/2, this.y - 5);
    }
    
    drawEnemyCat(ctx) {
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;
        const monsterColor = this.getMonsterColor();
        
        ctx.save();
        
        // 좌우 반전 (플레이어 쪽을 바라보도록)
        if (this.facing < 0) {
            ctx.scale(-1, 1);
            ctx.translate(-centerX * 2, 0);
        }
        
        // 애니메이션 효과
        let bounceY = 0;
        let eyeState = "normal";
        
        if (this.targetPlayer) {
            bounceY = Math.sin(Date.now() * 0.01) * 1;
            eyeState = "angry";
        } else {
            bounceY = Math.sin(Date.now() * 0.005) * 0.5;
        }
        
        // 몸통 (적 고양이는 약간 더 각져보이게)
        ctx.fillStyle = monsterColor;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + bounceY, 10, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 머리
        ctx.fillStyle = monsterColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY - 12 + bounceY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // 귀 (적 고양이는 더 뾰족하게)
        ctx.fillStyle = monsterColor;
        ctx.beginPath();
        // 왼쪽 귀
        ctx.moveTo(centerX - 6, centerY - 16 + bounceY);
        ctx.lineTo(centerX - 3, centerY - 22 + bounceY);
        ctx.lineTo(centerX - 1, centerY - 15 + bounceY);
        ctx.closePath();
        ctx.fill();
        
        // 오른쪽 귀  
        ctx.beginPath();
        ctx.moveTo(centerX + 6, centerY - 16 + bounceY);
        ctx.lineTo(centerX + 3, centerY - 22 + bounceY);
        ctx.lineTo(centerX + 1, centerY - 15 + bounceY);
        ctx.closePath();
        ctx.fill();
        
        // 귀 안쪽 (어두운 빨간색)
        ctx.fillStyle = "#8B0000";
        ctx.beginPath();
        ctx.moveTo(centerX - 5, centerY - 16 + bounceY);
        ctx.lineTo(centerX - 3, centerY - 19 + bounceY);
        ctx.lineTo(centerX - 2, centerY - 15 + bounceY);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(centerX + 5, centerY - 16 + bounceY);
        ctx.lineTo(centerX + 3, centerY - 19 + bounceY);
        ctx.lineTo(centerX + 2, centerY - 15 + bounceY);
        ctx.closePath();
        ctx.fill();
        
        // 눈
        ctx.fillStyle = "#FF0000";
        if (eyeState === "angry") {
            // 화난 빨간 눈
            ctx.beginPath();
            ctx.arc(centerX - 3, centerY - 13 + bounceY, 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(centerX + 3, centerY - 13 + bounceY, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // 눈빛 효과
            ctx.fillStyle = "#FFFF00";
            ctx.beginPath();
            ctx.arc(centerX - 3, centerY - 13 + bounceY, 1, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(centerX + 3, centerY - 13 + bounceY, 1, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 일반 노란 눈
            ctx.fillStyle = "#FFFF00";
            ctx.beginPath();
            ctx.arc(centerX - 3, centerY - 13 + bounceY, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(centerX + 3, centerY - 13 + bounceY, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 코 (검은색)
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 10 + bounceY);
        ctx.lineTo(centerX - 1, centerY - 8 + bounceY);
        ctx.lineTo(centerX + 1, centerY - 8 + bounceY);
        ctx.closePath();
        ctx.fill();
        
        // 입 (사악한 미소)
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY - 7 + bounceY, 2, 0, Math.PI);
        ctx.stroke();
        
        // 송곳니 (적만의 특징)
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.moveTo(centerX - 2, centerY - 7 + bounceY);
        ctx.lineTo(centerX - 1, centerY - 5 + bounceY);
        ctx.lineTo(centerX - 0.5, centerY - 7 + bounceY);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(centerX + 2, centerY - 7 + bounceY);
        ctx.lineTo(centerX + 1, centerY - 5 + bounceY);
        ctx.lineTo(centerX + 0.5, centerY - 7 + bounceY);
        ctx.closePath();
        ctx.fill();
        
        // 수염 (더 삐쳐보이게)
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        // 왼쪽 수염
        ctx.beginPath();
        ctx.moveTo(centerX - 6, centerY - 9 + bounceY);
        ctx.lineTo(centerX - 10, centerY - 7 + bounceY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX - 6, centerY - 7 + bounceY);
        ctx.lineTo(centerX - 10, centerY - 8 + bounceY);
        ctx.stroke();
        
        // 오른쪽 수염
        ctx.beginPath();
        ctx.moveTo(centerX + 6, centerY - 9 + bounceY);
        ctx.lineTo(centerX + 10, centerY - 7 + bounceY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX + 6, centerY - 7 + bounceY);
        ctx.lineTo(centerX + 10, centerY - 8 + bounceY);
        ctx.stroke();
        
        // 꼬리 (날카롭게)
        ctx.fillStyle = monsterColor;
        ctx.beginPath();
        const tailX = centerX - 8;
        const tailY = centerY + 3 + bounceY;
        // 삼각형 꼬리
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(tailX - 3, tailY - 2);
        ctx.lineTo(tailX - 2, tailY + 3);
        ctx.closePath();
        ctx.fill();
        
        // 발톱 (적만의 특징)
        ctx.strokeStyle = "#FFF";
        ctx.lineWidth = 1;
        
        // 앞발 발톱
        for (let i = 0; i < 2; i++) {
            const clawX = centerX + (i === 0 ? -4 : 4);
            const clawY = centerY + 12 + bounceY;
            ctx.beginPath();
            ctx.moveTo(clawX, clawY);
            ctx.lineTo(clawX, clawY + 2);
            ctx.stroke();
        }
        
        // 몬스터 타입별 특수 표시
        this.drawMonsterTypeIndicator(ctx, centerX, centerY + bounceY);
        
        ctx.restore();
    }
    
    drawMonsterTypeIndicator(ctx, centerX, centerY) {
        // 몬스터 타입에 따른 특수 표시
        ctx.font = "12px monospace";
        ctx.textAlign = "center";
        
        switch (this.type) {
            case "슬라임":
                ctx.fillStyle = "#00FF00";
                ctx.fillText("💧", centerX, centerY - 25);
                break;
            case "아기버그":
                ctx.fillStyle = "#8B4513";
                ctx.fillText("🐛", centerX, centerY - 25);
                break;
            case "고블린 전사":
                ctx.fillStyle = "#FF4500";
                ctx.fillText("⚔️", centerX, centerY - 25);
                break;
            case "고블린 궁수":
                ctx.fillStyle = "#32CD32";
                ctx.fillText("🏹", centerX, centerY - 25);
                break;
            case "얼음 늑대":
                ctx.fillStyle = "#87CEEB";
                ctx.fillText("❄️", centerX, centerY - 25);
                break;
            case "아이스 고스트":
                ctx.fillStyle = "#B0C4DE";
                ctx.fillText("👻", centerX, centerY - 25);
                break;
        }
    }
    
    getMonsterColor() {
        if (this.targetPlayer) {
            return "#ff6666"; // 적대적일 때 빨간색
        }
        return "#666666"; // 평상시 회색
    }
    
    drawHealthBar(ctx) {
        const barWidth = this.width;
        const barHeight = 4;
        const hpPercent = this.currentHP / this.maxHP;
        
        // 배경
        ctx.fillStyle = "#333";
        ctx.fillRect(this.x, this.y - 8, barWidth, barHeight);
        
        // HP
        ctx.fillStyle = hpPercent > 0.6 ? "#4CAF50" : hpPercent > 0.3 ? "#FF9800" : "#F44336";
        ctx.fillRect(this.x, this.y - 8, barWidth * hpPercent, barHeight);
        
        // 테두리
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y - 8, barWidth, barHeight);
    }
    
    drawStatusEffects(ctx) {
        let xOffset = 0;
        for (let effect of this.statusEffects) {
            const statusInfo = STATUS_EFFECTS[effect.type];
            if (statusInfo) {
                ctx.fillStyle = statusInfo.색상;
                ctx.fillRect(this.x + xOffset, this.y - 18, 12, 8);
                ctx.fillStyle = "#fff";
                ctx.font = "8px monospace";
                ctx.textAlign = "center";
                ctx.fillText(statusInfo.아이콘, this.x + xOffset + 6, this.y - 12);
                xOffset += 15;
            }
        }
    }
}

// 몬스터 매니저 클래스
class MonsterManager {
    constructor() {
        this.monsters = [];
        this.spawnPoints = [];
        this.lastSpawn = 0;
        this.spawnCooldown = 5000; // 5초
        this.maxMonsters = 10;
    }
    
    initialize(area) {
        this.monsters = [];
        this.setupSpawnPoints(area);
        this.spawnInitialMonsters(area);
    }
    
    setupSpawnPoints(area) {
        this.spawnPoints = [];
        const areaData = AREAS[area];
        
        // 화면에 여러 스폰 포인트 설정
        for (let i = 0; i < 5; i++) {
            this.spawnPoints.push({
                x: 100 + i * 200,
                y: 650 - 32,
                area: area
            });
        }
    }
    
    spawnInitialMonsters(area) {
        const areaData = AREAS[area];
        const monsterTypes = areaData.몬스터;
        
        // 초기 몬스터 스폰
        for (let i = 0; i < Math.min(this.maxMonsters, this.spawnPoints.length); i++) {
            const spawnPoint = this.spawnPoints[i];
            const monsterType = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
            
            this.spawnMonster(monsterType, spawnPoint.x, spawnPoint.y);
        }
    }
    
    update(deltaTime, player) {
        // 몬스터 업데이트
        for (let monster of this.monsters) {
            monster.update(deltaTime, player);
        }
        
        // 새 몬스터 스폰
        this.updateSpawning(deltaTime, player.currentArea);
        
        // 죽은 몬스터 정리 (리스폰 타이머가 있으므로 제거하지 않음)
    }
    
    updateSpawning(deltaTime, area) {
        const now = Date.now();
        if (now - this.lastSpawn < this.spawnCooldown) return;
        
        const aliveMonsters = this.monsters.filter(m => !m.isDead).length;
        if (aliveMonsters >= this.maxMonsters) return;
        
        // 랜덤 스폰 포인트에서 몬스터 스폰
        const areaData = AREAS[area];
        const monsterTypes = areaData.몬스터;
        const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
        const monsterType = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
        
        // 스폰 포인트 근처에 몬스터가 없는지 확인
        const nearbyMonster = this.monsters.find(m => 
            !m.isDead && Math.abs(m.x - spawnPoint.x) < 100
        );
        
        if (!nearbyMonster) {
            this.spawnMonster(monsterType, spawnPoint.x, spawnPoint.y);
            this.lastSpawn = now;
        }
    }
    
    spawnMonster(type, x, y) {
        const monster = new Monster(type, x, y);
        this.monsters.push(monster);
        return monster;
    }
    
    getAliveMonsters() {
        return this.monsters.filter(m => !m.isDead);
    }
    
    draw(ctx) {
        for (let monster of this.monsters) {
            monster.draw(ctx);
        }
    }
}
