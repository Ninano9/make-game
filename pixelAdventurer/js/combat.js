// 전투 시스템
class CombatSystem {
    constructor() {
        this.projectiles = [];
        this.effects = [];
        this.damageNumbers = [];
    }
    
    update(deltaTime) {
        // 투사체 업데이트
        this.updateProjectiles(deltaTime);
        
        // 이펙트 업데이트
        this.updateEffects(deltaTime);
        
        // 데미지 숫자 업데이트
        this.updateDamageNumbers(deltaTime);
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(deltaTime);
            
            if (projectile.shouldRemove) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    updateEffects(deltaTime) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.update(deltaTime);
            
            if (effect.shouldRemove) {
                this.effects.splice(i, 1);
            }
        }
    }
    
    updateDamageNumbers(deltaTime) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dmgNum = this.damageNumbers[i];
            dmgNum.update(deltaTime);
            
            if (dmgNum.shouldRemove) {
                this.damageNumbers.splice(i, 1);
            }
        }
    }
    
    createProjectile(x, y, targetX, targetY, damage, type, owner) {
        const projectile = new Projectile(x, y, targetX, targetY, damage, type, owner);
        this.projectiles.push(projectile);
        return projectile;
    }
    
    createEffect(x, y, type, duration = 1000) {
        const effect = new Effect(x, y, type, duration);
        this.effects.push(effect);
        return effect;
    }
    
    createDamageNumber(x, y, damage, type = "normal") {
        const dmgNum = new DamageNumber(x, y, damage, type);
        this.damageNumbers.push(dmgNum);
        return dmgNum;
    }
    
    draw(ctx) {
        // 투사체 그리기
        for (let projectile of this.projectiles) {
            projectile.draw(ctx);
        }
        
        // 이펙트 그리기
        for (let effect of this.effects) {
            effect.draw(ctx);
        }
        
        // 데미지 숫자 그리기
        for (let dmgNum of this.damageNumbers) {
            dmgNum.draw(ctx);
        }
    }
}

// 투사체 클래스
class Projectile {
    constructor(x, y, targetX, targetY, damage, type, owner) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = damage;
        this.type = type; // arrow, magic, fireball 등
        this.owner = owner; // player, monster
        
        // 속도 계산
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = this.getSpeed();
        
        this.velocityX = (dx / distance) * speed;
        this.velocityY = (dy / distance) * speed;
        
        // 속성
        this.maxDistance = this.getMaxDistance();
        this.traveledDistance = 0;
        this.shouldRemove = false;
        this.piercing = this.getPiercing();
        this.hitTargets = [];
        
        // 시각적 속성
        this.size = this.getSize();
        this.color = this.getColor();
        this.trail = [];
    }
    
    getSpeed() {
        switch (this.type) {
            case "arrow": return 8;
            case "magic": return 6;
            case "fireball": return 5;
            case "ice": return 4;
            case "lightning": return 12;
            default: return 6;
        }
    }
    
    getMaxDistance() {
        switch (this.type) {
            case "arrow": return 300;
            case "magic": return 250;
            case "fireball": return 200;
            default: return 200;
        }
    }
    
    getPiercing() {
        switch (this.type) {
            case "piercing_arrow": return 3; // 3명까지 관통
            default: return 0;
        }
    }
    
    getSize() {
        switch (this.type) {
            case "arrow": return 3;
            case "fireball": return 8;
            case "magic": return 5;
            default: return 4;
        }
    }
    
    getColor() {
        switch (this.type) {
            case "arrow": return "#8B4513";
            case "fireball": return "#FF4500";
            case "magic": return "#4169E1";
            case "ice": return "#87CEEB";
            case "lightning": return "#FFD700";
            default: return "#FFFFFF";
        }
    }
    
    update(deltaTime) {
        // 위치 업데이트
        const moveDistance = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.traveledDistance += moveDistance;
        
        // 트레일 업데이트
        this.updateTrail();
        
        // 최대 거리 확인
        if (this.traveledDistance >= this.maxDistance) {
            this.onReachMaxDistance();
            return;
        }
        
        // 충돌 검사
        this.checkCollisions();
    }
    
    updateTrail() {
        this.trail.push({ x: this.x, y: this.y, alpha: 1.0 });
        
        // 트레일 길이 제한
        if (this.trail.length > 5) {
            this.trail.shift();
        }
        
        // 트레일 투명도 감소
        for (let i = 0; i < this.trail.length; i++) {
            this.trail[i].alpha = (i + 1) / this.trail.length * 0.5;
        }
    }
    
    checkCollisions() {
        const targets = this.getTargets();
        
        for (let target of targets) {
            if (this.hitTargets.includes(target)) continue;
            
            const dx = target.x + target.width/2 - this.x;
            const dy = target.y + target.height/2 - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.size + target.width/2) {
                this.onHit(target);
                
                // 관통하지 않으면 투사체 제거
                if (this.piercing <= 0) {
                    this.shouldRemove = true;
                    return;
                } else {
                    this.piercing--;
                    this.hitTargets.push(target);
                }
            }
        }
    }
    
    getTargets() {
        if (this.owner === "player") {
            return game.monsterManager.getAliveMonsters();
        } else {
            return [game.player];
        }
    }
    
    onHit(target) {
        let finalDamage = this.damage;
        
        // 관통으로 인한 데미지 감소
        if (this.hitTargets.length > 0 && this.type === "piercing_arrow") {
            finalDamage = Math.floor(finalDamage * Math.max(0.6, 1 - this.hitTargets.length * 0.2));
        }
        
        // 데미지 적용
        const actualDamage = target.takeDamage(finalDamage, this.getAttackType());
        
        // 데미지 숫자 표시
        const isCrit = actualDamage > finalDamage; // 임시로 치명타 판정
        game.combatSystem.createDamageNumber(
            target.x + target.width/2,
            target.y,
            actualDamage,
            isCrit ? "crit" : "normal"
        );
        
        // 히트 이펙트 생성
        this.createHitEffect(target);
        
        // 타입별 특수 효과
        this.applySpecialEffects(target);
    }
    
    getAttackType() {
        switch (this.type) {
            case "magic":
            case "fireball":
            case "ice":
            case "lightning":
                return "magic";
            default:
                return "physical";
        }
    }
    
    createHitEffect(target) {
        switch (this.type) {
            case "fireball":
                game.combatSystem.createEffect(target.x, target.y, "explosion", 500);
                break;
            case "ice":
                game.combatSystem.createEffect(target.x, target.y, "freeze", 800);
                break;
            case "lightning":
                game.combatSystem.createEffect(target.x, target.y, "spark", 300);
                break;
            default:
                game.combatSystem.createEffect(target.x, target.y, "hit", 200);
                break;
        }
    }
    
    applySpecialEffects(target) {
        switch (this.type) {
            case "fireball":
                target.addStatusEffect({
                    type: "화상",
                    duration: 3000,
                    damage: 12,
                    nextTick: 0
                });
                break;
            case "ice":
                target.addStatusEffect({
                    type: "둔화",
                    duration: 3000
                });
                break;
        }
    }
    
    onReachMaxDistance() {
        // 일부 투사체는 최대 거리에서 특수 효과
        if (this.type === "fireball") {
            game.combatSystem.createEffect(this.x, this.y, "explosion", 800);
        }
        
        this.shouldRemove = true;
    }
    
    draw(ctx) {
        // 트레일 그리기
        for (let i = 0; i < this.trail.length - 1; i++) {
            const point = this.trail[i];
            ctx.globalAlpha = point.alpha;
            ctx.fillStyle = this.color;
            ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
        }
        
        ctx.globalAlpha = 1;
        
        // 투사체 본체 그리기
        ctx.fillStyle = this.color;
        
        switch (this.type) {
            case "arrow":
                this.drawArrow(ctx);
                break;
            case "fireball":
                this.drawFireball(ctx);
                break;
            case "magic":
                this.drawMagic(ctx);
                break;
            default:
                ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
                break;
        }
    }
    
    drawArrow(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 화살 방향 계산
        const angle = Math.atan2(this.velocityY, this.velocityX);
        ctx.rotate(angle);
        
        // 화살 그리기
        ctx.fillRect(-6, -1, 12, 2);
        ctx.fillRect(4, -3, 4, 6);
        
        ctx.restore();
    }
    
    drawFireball(ctx) {
        // 불 효과
        ctx.fillStyle = "#FF4500";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawMagic(ctx) {
        // 마법 효과
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // 반짝임 효과
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(this.x - 1, this.y - 1, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 이펙트 클래스
class Effect {
    constructor(x, y, type, duration) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.duration = duration;
        this.maxDuration = duration;
        this.shouldRemove = false;
        
        this.frame = 0;
        this.frameTime = 0;
        this.scale = 1;
        this.alpha = 1;
        this.rotation = 0;
    }
    
    update(deltaTime) {
        this.duration -= deltaTime;
        this.frameTime += deltaTime;
        
        // 프레임 업데이트
        if (this.frameTime >= 100) {
            this.frame++;
            this.frameTime = 0;
        }
        
        // 타입별 업데이트
        this.updateByType(deltaTime);
        
        // 투명도 계산
        this.alpha = Math.max(0, this.duration / this.maxDuration);
        
        if (this.duration <= 0) {
            this.shouldRemove = true;
        }
    }
    
    updateByType(deltaTime) {
        switch (this.type) {
            case "explosion":
                this.scale = 1 + (1 - this.alpha) * 2;
                this.rotation += deltaTime * 0.01;
                break;
            case "hit":
                this.scale = 1 + (1 - this.alpha) * 0.5;
                break;
            case "freeze":
                this.scale = 1 + Math.sin(this.frame * 0.3) * 0.2;
                break;
            case "spark":
                this.rotation += deltaTime * 0.02;
                break;
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.rotate(this.rotation);
        
        switch (this.type) {
            case "explosion":
                this.drawExplosion(ctx);
                break;
            case "hit":
                this.drawHit(ctx);
                break;
            case "freeze":
                this.drawFreeze(ctx);
                break;
            case "spark":
                this.drawSpark(ctx);
                break;
            case "slash":
                this.drawSlash(ctx);
                break;
            case "sparkle":
                this.drawSparkle(ctx);
                break;
        }
        
        ctx.restore();
    }
    
    drawExplosion(ctx) {
        // 폭발 효과
        ctx.fillStyle = "#FF4500";
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawHit(ctx) {
        // 타격 효과
        ctx.fillStyle = "#FFFFFF";
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x = Math.cos(angle) * 10;
            const y = Math.sin(angle) * 10;
            ctx.fillRect(x - 1, y - 1, 2, 2);
        }
    }
    
    drawFreeze(ctx) {
        // 빙결 효과
        ctx.strokeStyle = "#87CEEB";
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
            ctx.stroke();
        }
    }
    
    drawSpark(ctx) {
        // 번개 효과
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + this.rotation;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * 12, Math.sin(angle) * 12);
            ctx.stroke();
        }
    }
    
    drawSlash(ctx) {
        // 검 휘두르기 효과
        ctx.strokeStyle = "#CCCCCC";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        
        // 호 모양의 검 궤적
        ctx.beginPath();
        ctx.arc(0, 0, 25, -Math.PI/4, Math.PI/4);
        ctx.stroke();
        
        // 내부 빛나는 효과
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 25, -Math.PI/4, Math.PI/4);
        ctx.stroke();
    }
    
    drawSparkle(ctx) {
        // 반짝이는 입자 효과
        ctx.fillStyle = "#FFFF99";
        
        // 십자 모양 반짝임
        ctx.fillRect(-6, -1, 12, 2);
        ctx.fillRect(-1, -6, 2, 12);
        
        // 중앙 밝은 점
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 데미지 숫자 클래스
class DamageNumber {
    constructor(x, y, damage, type) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.type = type; // normal, crit, heal
        this.shouldRemove = false;
        
        this.velocityY = -2;
        this.duration = 1500;
        this.maxDuration = 1500;
        this.scale = 1;
        this.alpha = 1;
        
        // 타입별 설정
        this.setupByType();
    }
    
    setupByType() {
        switch (this.type) {
            case "crit":
                this.scale = 1.5;
                this.velocityY = -3;
                break;
            case "heal":
                this.velocityY = -1.5;
                break;
        }
    }
    
    update(deltaTime) {
        this.duration -= deltaTime;
        this.y += this.velocityY;
        this.velocityY *= 0.98; // 감속
        
        // 투명도 계산
        this.alpha = Math.max(0, this.duration / this.maxDuration);
        
        if (this.duration <= 0) {
            this.shouldRemove = true;
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.font = `${16 * this.scale}px monospace`;
        ctx.textAlign = "center";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        
        // 타입별 색상
        switch (this.type) {
            case "crit":
                ctx.fillStyle = "#FFD700";
                break;
            case "heal":
                ctx.fillStyle = "#00FF00";
                break;
            default:
                ctx.fillStyle = "#FFFFFF";
                break;
        }
        
        const text = this.type === "crit" ? `${this.damage}!` : `${this.damage}`;
        
        // 외곽선
        ctx.strokeText(text, this.x, this.y);
        // 텍스트
        ctx.fillText(text, this.x, this.y);
        
        ctx.restore();
    }
}
