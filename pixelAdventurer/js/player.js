// 플레이어 클래스
class Player {
    constructor(playerClass) {
        this.class = playerClass;
        this.classData = CLASSES[playerClass];
        
        // 기본 정보
        this.level = 1;
        this.experience = 0;
        this.skillPoints = 0;
        this.gold = 0;
        
        // 위치 및 물리
        this.x = 400;
        this.y = 600;
        this.width = 32;
        this.height = 48;
        this.velocityX = 0;
        this.velocityY = 0;
        this.onGround = false;
        this.facing = 1; // 1: 오른쪽, -1: 왼쪽
        
        // 능력치 초기화
        this.initStats();
        
        // 전투 관련
        this.lastAttack = 0;
        this.lastHit = 0;
        this.isInvincible = false;
        
        // 스킬 쿨타임
        this.skillCooldowns = {};
        this.skillLevels = { 스킬1: 1, 스킬2: 1, 스킬3: 1 };
        
        // 상태 효과
        this.statusEffects = [];
        
        // 장비
        this.equipment = {
            무기: null,
            갑옷: null,
            장갑: null,
            신발: null,
            반지: null
        };
        
        // 인벤토리
        this.inventory = {
            "체력 포션(작)": 5,
            "마나 포션(작)": 3
        };
        
        // 애니메이션
        this.animationState = "idle";
        this.animationFrame = 0;
        this.animationTime = 0;
        
        // 현재 지역
        this.currentArea = "초록 들판";
    }
    
    initStats() {
        const baseStats = this.classData.기본능력치;
        const levelBonus = this.classData.레벨당증가;
        
        // 기본 능력치 계산
        this.maxHP = baseStats.HP + (levelBonus.HP || 0) * (this.level - 1);
        this.maxMP = baseStats.MP + (levelBonus.MP || 0) * (this.level - 1);
        this.attack = baseStats.공격력 + (levelBonus.공격력 || 0) * (this.level - 1);
        this.magic = baseStats.마법력 + (levelBonus.마법력 || 0) * (this.level - 1);
        this.defense = baseStats.방어력 + (levelBonus.방어력 || 0) * (this.level - 1);
        this.magicResist = baseStats.마법저항 + (levelBonus.마법저항 || 0) * (this.level - 1);
        this.critChance = baseStats.치확 + (levelBonus.치확 || 0) * (this.level - 1);
        this.critDamage = baseStats.치피;
        this.moveSpeed = baseStats.이속;
        this.attackSpeed = baseStats.공속;
        
        // 현재 HP/MP (최대치로 설정)
        this.currentHP = this.maxHP;
        this.currentMP = this.maxMP;
    }
    
    update(deltaTime) {
        // 물리 업데이트
        this.updatePhysics(deltaTime);
        
        // 상태 효과 업데이트
        this.updateStatusEffects(deltaTime);
        
        // 스킬 쿨타임 업데이트
        this.updateCooldowns(deltaTime);
        
        // 무적 시간 업데이트
        if (this.isInvincible && Date.now() - this.lastHit > GAME_CONFIG.INVINCIBILITY_TIME) {
            this.isInvincible = false;
        }
        
        // 애니메이션 업데이트
        this.updateAnimation(deltaTime);
        
        // HP/MP 자연 회복
        this.updateRegeneration(deltaTime);
    }
    
    updatePhysics(deltaTime) {
        // 중력 적용
        if (!this.onGround) {
            this.velocityY += GAME_CONFIG.GRAVITY;
        }
        
        // 위치 업데이트
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // 지면 충돌 (간단한 구현)
        const groundY = 650;
        if (this.y + this.height >= groundY) {
            this.y = groundY - this.height;
            this.velocityY = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }
        
        // 화면 경계 제한
        this.x = Math.max(0, Math.min(GAME_CONFIG.CANVAS_WIDTH - this.width, this.x));
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
    
    updateCooldowns(deltaTime) {
        for (let skill in this.skillCooldowns) {
            if (this.skillCooldowns[skill] > 0) {
                this.skillCooldowns[skill] -= deltaTime;
                if (this.skillCooldowns[skill] <= 0) {
                    this.skillCooldowns[skill] = 0;
                }
            }
        }
    }
    
    updateAnimation(deltaTime) {
        this.animationTime += deltaTime;
        
        // 애니메이션 프레임 업데이트 (300ms마다)
        if (this.animationTime >= 300) {
            this.animationFrame++;
            this.animationTime = 0;
        }
        
        // 상태에 따른 애니메이션 결정
        if (Math.abs(this.velocityX) > 0.1) {
            this.animationState = "walk";
        } else if (!this.onGround) {
            this.animationState = "jump";
        } else {
            this.animationState = "idle";
        }
    }
    
    updateRegeneration(deltaTime) {
        // 자연 HP 회복 (초당 1%)
        if (this.currentHP < this.maxHP) {
            this.currentHP = Math.min(this.maxHP, this.currentHP + (this.maxHP * 0.01 * deltaTime / 1000));
        }
        
        // 자연 MP 회복 (초당 2%)
        if (this.currentMP < this.maxMP) {
            this.currentMP = Math.min(this.maxMP, this.currentMP + (this.maxMP * 0.02 * deltaTime / 1000));
        }
    }
    
    move(direction) {
        if (this.hasStatusEffect("기절") || this.hasStatusEffect("빙결")) {
            return;
        }
        
        let speed = this.moveSpeed;
        if (this.hasStatusEffect("둔화")) {
            speed *= 0.7; // 30% 속도 감소
        }
        
        this.velocityX = direction * speed;
        this.facing = direction;
    }
    
    jump() {
        if (this.onGround && !this.hasStatusEffect("기절") && !this.hasStatusEffect("빙결")) {
            this.velocityY = GAME_CONFIG.JUMP_POWER;
            this.onGround = false;
            this.animationState = "jump";
        }
    }
    
    attack() {
        if (this.hasStatusEffect("기절")) return;
        
        const now = Date.now();
        const attackDelay = 1000 / this.attackSpeed;
        
        if (now - this.lastAttack < attackDelay) return;
        
        this.lastAttack = now;
        this.animationState = "attack";
        
        // 기본 공격 데미지 계산
        let damage;
        if (this.class === "마법사") {
            damage = Math.floor(this.magic * 1.1); // 마법사는 마법력 기반
        } else {
            damage = Math.floor(this.attack * 1.0); // 전사, 궁수는 공격력 기반
        }
        
        // 무기 공격력 추가
        if (this.equipment.무기) {
            if (this.class === "마법사") {
                damage += this.equipment.무기.옵션.마법력 || 0;
            } else {
                damage += this.equipment.무기.옵션.공격력 || 0;
            }
        }
        
        // 치명타 확인
        const isCrit = Math.random() * 100 < this.critChance;
        if (isCrit) {
            damage = Math.floor(damage * (this.critDamage / 100));
        }
        
        // 공격 범위 내 몬스터 찾기
        const attackRange = this.class === "궁수" || this.class === "마법사" ? 200 : 60;
        const targets = this.findTargetsInRange(attackRange);
        
        for (let target of targets) {
            this.dealDamageToTarget(target, damage, isCrit);
        }
        
        // 공격 이펙트 생성
        this.createAttackEffect();
        
        return true;
    }
    
    useSkill(skillIndex) {
        const skill = this.classData.스킬[skillIndex];
        if (!skill) return false;
        
        const skillKey = `스킬${skillIndex + 1}`;
        
        // 쿨타임 확인
        if (this.skillCooldowns[skillKey] > 0) return false;
        
        // MP 확인
        if (this.currentMP < skill.MP) return false;
        
        // 상태 확인
        if (this.hasStatusEffect("기절")) return false;
        
        // MP 소모
        this.currentMP -= skill.MP;
        
        // 쿨타임 적용
        this.skillCooldowns[skillKey] = skill.쿨타임 * 1000;
        
        // 스킬 효과 적용
        this.applySkillEffect(skill, skillIndex);
        
        // 로그 추가
        game.addCombatLog(`${skill.이름} 사용!`, "skill");
        
        return true;
    }
    
    applySkillEffect(skill, skillIndex) {
        const skillLevel = this.skillLevels[`스킬${skillIndex + 1}`];
        const baseCoeff = skill.계수 + (skillLevel - 1) * 0.1; // 레벨당 10% 증가
        
        switch (skill.이름) {
            case "회전 베기":
                this.applySpinAttack(baseCoeff);
                break;
            case "강타":
                this.applyPowerStrike(baseCoeff);
                break;
            case "철벽 자세":
                this.applyDefensiveStance(skill);
                break;
            case "연속 사격":
                this.applyRapidShot(skill, skillLevel);
                break;
            case "관통 화살":
                this.applyPiercingArrow(baseCoeff);
                break;
            case "급소 명중":
                this.applyPrecisionShot(skill);
                break;
            case "파이어볼":
                this.applyFireball(baseCoeff, skill);
                break;
            case "아이스 스파이크":
                this.applyIceSpike(baseCoeff, skill);
                break;
            case "메테오":
                this.applyMeteor(baseCoeff, skill);
                break;
        }
    }
    
    applySpinAttack(coefficient) {
        // 주변 360도 공격
        const targets = this.findTargetsInRange(80);
        const damage = Math.floor(this.attack * coefficient);
        
        for (let target of targets) {
            this.dealDamageToTarget(target, damage, false, "spin");
        }
    }
    
    applyPowerStrike(coefficient) {
        // 앞쪽 단일 타겟에 강력한 공격
        const targets = this.findTargetsInRange(60);
        if (targets.length > 0) {
            const damage = Math.floor(this.attack * coefficient);
            this.dealDamageToTarget(targets[0], damage, false, "power");
        }
    }
    
    applyDefensiveStance(skill) {
        // 방어 버프 적용
        this.addStatusEffect({
            type: "방어증가",
            duration: skill.지속 * 1000,
            damageReduction: skill.받는피해감소
        });
    }
    
    applyFireball(coefficient, skill) {
        // 폭발 공격
        const targets = this.findTargetsInRange(150);
        const damage = Math.floor(this.magic * coefficient);
        
        for (let target of targets) {
            this.dealDamageToTarget(target, damage, false, "fire");
            // 화상 효과 추가
            target.addStatusEffect({
                type: "화상",
                duration: skill.화상지속 * 1000,
                damage: skill.화상초당,
                nextTick: 0
            });
        }
    }
    
    takeDamage(amount, type = "physical") {
        if (this.isInvincible) return 0;
        
        // 방어력 적용
        let finalDamage = amount;
        if (type === "physical") {
            finalDamage = Math.max(1, amount - this.defense);
        } else if (type === "magic") {
            finalDamage = Math.max(1, amount - this.magicResist);
        }
        
        // 방어 버프 적용
        const defBuff = this.statusEffects.find(e => e.type === "방어증가");
        if (defBuff) {
            finalDamage = Math.floor(finalDamage * (1 - defBuff.damageReduction));
        }
        
        this.currentHP = Math.max(0, this.currentHP - finalDamage);
        this.lastHit = Date.now();
        this.isInvincible = true;
        
        // 피격 이펙트
        this.createHitEffect();
        
        // 로그 추가
        game.addCombatLog(`${finalDamage} 피해를 받았습니다!`, "damage");
        
        // 사망 확인
        if (this.currentHP <= 0) {
            this.die();
        }
        
        return finalDamage;
    }
    
    heal(amount) {
        const oldHP = this.currentHP;
        this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
        const healed = this.currentHP - oldHP;
        
        if (healed > 0) {
            game.addCombatLog(`HP ${healed} 회복!`, "heal");
        }
        
        return healed;
    }
    
    restoreMP(amount) {
        const oldMP = this.currentMP;
        this.currentMP = Math.min(this.maxMP, this.currentMP + amount);
        const restored = this.currentMP - oldMP;
        
        if (restored > 0) {
            game.addCombatLog(`MP ${restored} 회복!`, "heal");
        }
        
        return restored;
    }
    
    gainExperience(amount) {
        this.experience += amount;
        game.addCombatLog(`경험치 ${amount} 획득!`, "exp");
        
        // 레벨업 확인
        const requiredExp = LEVEL_REQUIREMENTS[this.level];
        if (this.experience >= requiredExp && this.level < 30) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.level++;
        this.experience -= LEVEL_REQUIREMENTS[this.level - 1];
        this.skillPoints++;
        
        // 능력치 증가
        const oldMaxHP = this.maxHP;
        const oldMaxMP = this.maxMP;
        
        this.initStats();
        
        // HP/MP 회복 (증가한 만큼)
        this.currentHP += (this.maxHP - oldMaxHP);
        this.currentMP += (this.maxMP - oldMaxMP);
        
        game.addCombatLog(`레벨업! Lv.${this.level}`, "exp");
    }
    
    addGold(amount) {
        this.gold += amount;
        game.addCombatLog(`골드 ${amount} 획득!`, "gold");
    }
    
    hasStatusEffect(type) {
        return this.statusEffects.some(effect => effect.type === type);
    }
    
    addStatusEffect(effect) {
        // 같은 타입의 기존 효과 제거
        this.statusEffects = this.statusEffects.filter(e => e.type !== effect.type);
        this.statusEffects.push(effect);
    }
    
    findTargetsInRange(range) {
        // 몬스터들 중에서 범위 내에 있는 것들 찾기
        return game.monsters.filter(monster => {
            const dx = monster.x - this.x;
            const dy = monster.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 궁수와 마법사는 방향 제한 없음, 전사는 앞쪽만
            if (this.class === "전사") {
                const facingRight = this.facing > 0;
                const targetIsRight = dx > 0;
                if (facingRight !== targetIsRight && Math.abs(dx) > 30) {
                    return false;
                }
            }
            
            return distance <= range;
        });
    }
    
    dealDamageToTarget(target, damage, isCrit, attackType = "normal") {
        const finalDamage = target.takeDamage(damage, this.class === "마법사" ? "magic" : "physical");
        
        let logText = `${target.name}에게 ${finalDamage} 피해`;
        if (isCrit) logText += " (치명타!)";
        game.addCombatLog(logText, "damage");
    }
    
    createAttackEffect() {
        // 공격 이펙트 생성 (나중에 구현)
    }
    
    createHitEffect() {
        // 피격 이펙트 생성 (나중에 구현)
    }
    
    die() {
        // 사망 처리
        const lostGold = Math.floor(this.gold * ECONOMY.사망골드손실율);
        this.gold -= lostGold;
        this.currentHP = Math.floor(this.maxHP * 0.5); // 50% HP로 부활
        this.currentMP = Math.floor(this.maxMP * 0.5); // 50% MP로 부활
        
        // 상태 효과 초기화
        this.statusEffects = [];
        
        game.addCombatLog(`사망! 골드 ${lostGold} 손실`, "damage");
        game.addCombatLog("마을에서 부활했습니다", "heal");
        
        // 마을로 이동
        this.x = 400;
        this.y = 600;
    }
    
    usePotion(type) {
        const potions = {
            "hp": ["체력 포션(작)", "체력 포션(중)", "체력 포션(대)"],
            "mp": ["마나 포션(작)", "마나 포션(중)", "마나 포션(대)"]
        };
        
        // 가장 작은 포션부터 사용
        for (let potion of potions[type]) {
            if (this.inventory[potion] > 0) {
                this.inventory[potion]--;
                
                const item = ITEMS.소비아이템[potion];
                if (item.효과.HP회복) {
                    this.heal(item.효과.HP회복);
                }
                if (item.효과.MP회복) {
                    this.restoreMP(item.효과.MP회복);
                }
                return true;
            }
        }
        
        game.addCombatLog(`${type === "hp" ? "체력" : "마나"} 포션이 없습니다!`, "system");
        return false;
    }
    
    draw(ctx) {
        // 무적 상태일 때 깜빡임 효과
        if (this.isInvincible && Math.floor(Date.now() / 100) % 2) {
            ctx.globalAlpha = 0.5;
        }
        
        // 캐릭터 그리기
        ctx.fillStyle = this.getClassColor();
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 클래스 아이콘 그리기
        ctx.font = "24px monospace";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(this.classData.아이콘, this.x + this.width/2, this.y + this.height/2 + 8);
        
        // 상태 효과 표시
        this.drawStatusEffects(ctx);
        
        ctx.globalAlpha = 1;
    }
    
    getClassColor() {
        switch (this.class) {
            case "전사": return "#ff4444";
            case "궁수": return "#44ff44";
            case "마법사": return "#4444ff";
            default: return "#888888";
        }
    }
    
    drawStatusEffects(ctx) {
        let yOffset = 0;
        for (let effect of this.statusEffects) {
            const statusInfo = STATUS_EFFECTS[effect.type];
            if (statusInfo) {
                ctx.fillStyle = statusInfo.색상;
                ctx.fillRect(this.x - 5, this.y - 20 - yOffset, 20, 15);
                ctx.fillStyle = "#fff";
                ctx.font = "12px monospace";
                ctx.textAlign = "center";
                ctx.fillText(statusInfo.아이콘, this.x + 5, this.y - 10 - yOffset);
                yOffset += 20;
            }
        }
    }
}
