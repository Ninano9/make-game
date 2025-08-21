// 플레이어 클래스
class Player {
    constructor(playerClass) {
        console.log("Player 생성자 시작:", playerClass);
        this.class = playerClass;
        this.classData = CLASSES[playerClass];
        console.log("CLASSES 데이터:", this.classData);
        
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
        try {
            this.equipment = new Equipment();
            console.log("Equipment 생성 성공");
        } catch (error) {
            console.error("Equipment 생성 실패:", error);
            this.equipment = { slots: { 무기: null, 갑옷: null, 장갑: null, 신발: null, 반지: null } };
        }
        
        // 인벤토리
        try {
            this.inventory = new Inventory();
            this.inventory.consumables = {
                "체력 포션(작)": 5,
                "마나 포션(작)": 3
            };
            console.log("Inventory 생성 성공");
        } catch (error) {
            console.error("Inventory 생성 실패:", error);
            this.inventory = { 
                items: [],
                consumables: {
                    "체력 포션(작)": 5,
                    "마나 포션(작)": 3
                },
                maxSlots: 50
            };
        }
        
        // 애니메이션
        this.animationState = "idle";
        this.animationFrame = 0;
        this.animationTime = 0;
        
        // 현재 지역
        this.currentArea = "초록 들판";
        
        // 능력치 초기화
        this.initStats();
        
        // 메서드 바인딩 확인 및 강제 바인딩
        if (typeof this.attack !== 'function') {
            console.error("attack 메서드가 바인딩되지 않음! 직접 정의...");
            this.attack = function() {
                console.log("직접 정의된 attack 메서드 호출됨");
                if (this.hasStatusEffect && this.hasStatusEffect("기절")) return;
                
                const now = Date.now();
                const attackDelay = 1000 / (this.attackSpeed || 1);
                
                if (now - this.lastAttack < attackDelay) return;
                
                this.lastAttack = now;
                this.animationState = "attack";
                this.animationFrame = 0;
                
                // 기본 공격 데미지 계산
                let damage;
                // attack 속성과 attack 메서드 충돌 방지 - 속성을 다시 확인
                const attackStat = this.attackStat || this.attack || 12; // 기본값
                const magicStat = this.magic || 0;
                
                console.log("플레이어 능력치:", {
                    class: this.class,
                    attackStat: attackStat,
                    magicStat: magicStat,
                    level: this.level,
                    originalAttack: this.attack,
                    originalMagic: this.magic
                });
                
                if (this.class === "마법사") {
                    damage = Math.floor(magicStat * 1.1);
                } else {
                    damage = Math.floor(attackStat * 1.0);
                }
                
                console.log("계산된 기본 데미지:", damage);
                
                // 치명타 확인
                const isCrit = Math.random() * 100 < this.critChance;
                if (isCrit) {
                    damage = Math.floor(damage * (this.critDamage / 100));
                }
                
                // 직업별 공격 방식
                console.log("공격 시도 - 데미지:", damage, "직업:", this.class);
                
                if (this.class === "전사") {
                    // 전사: 근접 공격 (60px)
                    this.meleeAttack(damage, isCrit);
                } else if (this.class === "궁수") {
                    // 궁수: 원거리 투사체 (전사의 5배 = 300px)
                    this.rangedAttack(damage, isCrit, 300, "arrow");
                } else if (this.class === "마법사") {
                    // 마법사: 원거리 투사체 (전사의 3배 = 180px)
                    this.rangedAttack(damage, isCrit, 180, "magic");
                }
                
                return true;
            }.bind(this);
        }
        
        if (typeof this.useSkill !== 'function') {
            console.error("useSkill 메서드가 바인딩되지 않음! 직접 정의...");
            this.useSkill = function(skillIndex) {
                console.log("직접 정의된 useSkill 메서드 호출됨:", skillIndex);
                const skill = this.classData.스킬[skillIndex];
                if (!skill) return false;
                
                const skillKey = `스킬${skillIndex + 1}`;
                
                // 쿨타임 확인
                if (this.skillCooldowns[skillKey] > 0) return false;
                
                // MP 확인
                if (this.currentMP < skill.MP) return false;
                
                // MP 소모
                this.currentMP -= skill.MP;
                
                // 쿨타임 적용
                this.skillCooldowns[skillKey] = skill.쿨타임 * 1000;
                
                // 스킬 애니메이션
                this.animationState = "skill";
                this.animationFrame = 0;
                
                if (game) {
                    game.addCombatLog(`${skill.이름} 사용!`, "skill");
                }
                
                return true;
            }.bind(this);
        }
        
        if (typeof this.jump !== 'function') {
            console.error("jump 메서드가 바인딩되지 않음! 직접 정의...");
            this.jump = function() {
                console.log("직접 정의된 jump 메서드 호출됨");
                if (this.onGround && !this.hasStatusEffect("기절") && !this.hasStatusEffect("빙결")) {
                    this.velocityY = -12; // GAME_CONFIG.JUMP_POWER
                    this.onGround = false;
                    this.animationState = "jump";
                    this.animationFrame = 0;
                }
            }.bind(this);
        }
        
        // hasStatusEffect 메서드도 확인
        if (typeof this.hasStatusEffect !== 'function') {
            console.error("hasStatusEffect 메서드가 바인딩되지 않음! 직접 정의...");
            this.hasStatusEffect = function(type) {
                return this.statusEffects.some(effect => effect.type === type);
            }.bind(this);
        }
        
        // 추가 공격 메서드들
        this.meleeAttack = function(damage, isCrit) {
            console.log("전사 근접 공격:", damage);
            if (game && game.monsterManager) {
                const targets = game.monsterManager.getAliveMonsters();
                const attackRange = 60;
                
                let hitCount = 0;
                for (let target of targets) {
                    const dx = target.x - this.x;
                    const dy = target.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // 전사는 앞쪽만 공격 가능
                    const facingRight = this.facing > 0;
                    const targetIsRight = dx > 0;
                    if (facingRight !== targetIsRight && Math.abs(dx) > 30) {
                        continue;
                    }
                    
                    if (distance <= attackRange) {
                        const actualDamage = target.takeDamage(damage, "physical");
                        hitCount++;
                        
                        if (game.combatSystem) {
                            game.combatSystem.createDamageNumber(
                                target.x + target.width/2,
                                target.y,
                                actualDamage,
                                isCrit ? "crit" : "normal"
                            );
                        }
                        
                        if (game.addCombatLog) {
                            game.addCombatLog(`${target.name}에게 ${actualDamage} 데미지!`, "damage");
                        }
                    }
                }
                
                // 전사 공격 이펙트 (검 휘두르기)
                this.createWarriorAttackEffect();
                console.log("전사 근접 공격 완료, 적중:", hitCount);
            }
        }.bind(this);
        
        this.rangedAttack = function(damage, isCrit, maxRange, projectileType) {
            console.log("원거리 공격:", damage, "사거리:", maxRange, "타입:", projectileType);
            
            if (game && game.monsterManager) {
                const targets = game.monsterManager.getAliveMonsters();
                
                // 가장 가까운 적을 타겟으로 선정
                let closestTarget = null;
                let closestDistance = Infinity;
                
                for (let target of targets) {
                    const dx = target.x - this.x;
                    const dy = target.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance <= maxRange && distance < closestDistance) {
                        closestTarget = target;
                        closestDistance = distance;
                    }
                }
                
                if (closestTarget) {
                    // 투사체 생성
                    if (game.combatSystem) {
                        const projectile = game.combatSystem.createProjectile(
                            this.x + this.width/2,
                            this.y + this.height/2,
                            closestTarget.x + closestTarget.width/2,
                            closestTarget.y + closestTarget.height/2,
                            damage,
                            projectileType,
                            "player"
                        );
                        console.log("투사체 생성됨:", projectileType);
                    }
                } else {
                    console.log("사거리 내에 적이 없음");
                }
            }
        }.bind(this);
        
        this.createWarriorAttackEffect = function() {
            // 전사 공격 이펙트 (검 휘두르기 모션)
            if (game && game.combatSystem) {
                const effectX = this.x + (this.facing > 0 ? this.width : -20);
                const effectY = this.y + this.height/2;
                
                game.combatSystem.createEffect(effectX, effectY, "slash", 300);
                
                // 검 궤적 파티클
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                        if (game.combatSystem) {
                            const slashX = effectX + (this.facing * i * 8);
                            const slashY = effectY + (Math.random() - 0.5) * 20;
                            game.combatSystem.createEffect(slashX, slashY, "sparkle", 200);
                        }
                    }, i * 20);
                }
            }
        }.bind(this);
        
        console.log("Player 생성자 완료, attack 메서드:", typeof this.attack);
    }
    
    initStats() {
        console.log("initStats 호출됨");
        console.log("classData:", this.classData);
        const baseStats = this.classData.기본능력치;
        const levelBonus = this.classData.레벨당증가;
        
        console.log("baseStats:", baseStats);
        console.log("levelBonus:", levelBonus);
        
        // 기본 능력치 계산
        this.maxHP = baseStats.HP + (levelBonus.HP || 0) * (this.level - 1);
        this.maxMP = baseStats.MP + (levelBonus.MP || 0) * (this.level - 1);
        this.attackStat = baseStats.공격력 + (levelBonus.공격력 || 0) * (this.level - 1);
        this.attack = this.attackStat; // 호환성을 위해 둘 다 설정
        this.magic = baseStats.마법력 + (levelBonus.마법력 || 0) * (this.level - 1);
        this.defense = baseStats.방어력 + (levelBonus.방어력 || 0) * (this.level - 1);
        this.magicResist = baseStats.마법저항 + (levelBonus.마법저항 || 0) * (this.level - 1);
        this.critChance = baseStats.치확 + (levelBonus.치확 || 0) * (this.level - 1);
        this.critDamage = baseStats.치피;
        this.moveSpeed = baseStats.이속;
        this.attackSpeed = baseStats.공속;
        
        console.log("계산된 능력치:", {
            attack: this.attack,
            magic: this.magic,
            maxHP: this.maxHP,
            maxMP: this.maxMP
        });
        
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
            
            // 착지 시 점프 애니메이션 종료
            if (!this.onGround && this.animationState === "jump") {
                this.animationState = "idle";
                this.animationFrame = 0;
            }
            
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
        
        // 특수 애니메이션 상태 자동 리셋
        if (this.animationState === "attack" && this.animationFrame > 2) {
            this.animationState = "idle";
            this.animationFrame = 0;
        } else if (this.animationState === "skill" && this.animationFrame > 3) {
            this.animationState = "idle";
            this.animationFrame = 0;
        }
        
        // 자동 애니메이션 상태 결정 (특수 상태가 아닐 때만)
        if (this.animationState === "idle" || this.animationState === "walk") {
            if (Math.abs(this.velocityX) > 0.1) {
                this.animationState = "walk";
            } else if (!this.onGround) {
                this.animationState = "jump";
            } else {
                this.animationState = "idle";
            }
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
            this.animationFrame = 0; // 점프 애니메이션 리셋
        }
    }
    
    attack() {
        console.log("attack 메서드 호출됨");
        if (this.hasStatusEffect("기절")) return;
        
        const now = Date.now();
        const attackDelay = 1000 / this.attackSpeed;
        
        if (now - this.lastAttack < attackDelay) return;
        
        this.lastAttack = now;
        this.animationState = "attack";
        this.animationFrame = 0; // 공격 애니메이션 리셋
        
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
        
        console.log("attack 메서드 완료");
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
        
        // 스킬 애니메이션 상태 설정
        this.animationState = "skill";
        this.animationFrame = 0;
        
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
            if (this.inventory.consumables[potion] > 0) {
                this.inventory.consumables[potion]--;
                
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
        
        // 고양이 캐릭터 그리기
        this.drawCatCharacter(ctx);
        
        // 상태 효과 표시
        this.drawStatusEffects(ctx);
        
        ctx.globalAlpha = 1;
    }
    
    drawCatCharacter(ctx) {
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;
        const classColor = this.getClassColor();
        
        ctx.save();
        
        // 좌우 반전 (이동 방향에 따라)
        if (this.facing < 0) {
            ctx.scale(-1, 1);
            ctx.translate(-centerX * 2, 0);
        }
        
        // 애니메이션에 따른 추가 변형
        let bounceY = 0;
        let earTilt = 0;
        let eyeState = "normal";
        
        if (this.animationState === "jump") {
            bounceY = -5;
            earTilt = 0.2;
        } else if (this.animationState === "attack") {
            earTilt = -0.3;
            eyeState = "angry";
        } else if (this.animationState === "walk") {
            bounceY = Math.sin(this.animationFrame * 0.5) * 2;
        }
        
        // 몸통 (타원형)
        ctx.fillStyle = classColor;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + bounceY, 12, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 머리 (원형)
        ctx.fillStyle = classColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY - 15 + bounceY, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // 귀 (삼각형)
        ctx.fillStyle = classColor;
        ctx.beginPath();
        // 왼쪽 귀
        ctx.moveTo(centerX - 8, centerY - 20 + bounceY);
        ctx.lineTo(centerX - 4, centerY - 25 + bounceY + earTilt * 5);
        ctx.lineTo(centerX - 2, centerY - 18 + bounceY);
        ctx.closePath();
        ctx.fill();
        
        // 오른쪽 귀  
        ctx.beginPath();
        ctx.moveTo(centerX + 8, centerY - 20 + bounceY);
        ctx.lineTo(centerX + 4, centerY - 25 + bounceY - earTilt * 5);
        ctx.lineTo(centerX + 2, centerY - 18 + bounceY);
        ctx.closePath();
        ctx.fill();
        
        // 귀 안쪽 (분홍색)
        ctx.fillStyle = "#FFB6C1";
        ctx.beginPath();
        ctx.moveTo(centerX - 6, centerY - 19 + bounceY);
        ctx.lineTo(centerX - 4, centerY - 22 + bounceY + earTilt * 3);
        ctx.lineTo(centerX - 3, centerY - 18 + bounceY);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(centerX + 6, centerY - 19 + bounceY);
        ctx.lineTo(centerX + 4, centerY - 22 + bounceY - earTilt * 3);
        ctx.lineTo(centerX + 3, centerY - 18 + bounceY);
        ctx.closePath();
        ctx.fill();
        
        // 눈
        ctx.fillStyle = "#000";
        if (eyeState === "angry") {
            // 화난 눈 (/) (\)
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX - 6, centerY - 17 + bounceY);
            ctx.lineTo(centerX - 4, centerY - 15 + bounceY);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(centerX + 4, centerY - 17 + bounceY);
            ctx.lineTo(centerX + 6, centerY - 15 + bounceY);
            ctx.stroke();
        } else {
            // 일반 눈 (둥근 점)
            ctx.beginPath();
            ctx.arc(centerX - 4, centerY - 16 + bounceY, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(centerX + 4, centerY - 16 + bounceY, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 코 (분홍색 삼각형)
        ctx.fillStyle = "#FFB6C1";
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 13 + bounceY);
        ctx.lineTo(centerX - 1, centerY - 11 + bounceY);
        ctx.lineTo(centerX + 1, centerY - 11 + bounceY);
        ctx.closePath();
        ctx.fill();
        
        // 입 (작은 곡선)
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY - 10 + bounceY, 2, 0, Math.PI);
        ctx.stroke();
        
        // 수염
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        // 왼쪽 수염
        ctx.beginPath();
        ctx.moveTo(centerX - 8, centerY - 12 + bounceY);
        ctx.lineTo(centerX - 12, centerY - 11 + bounceY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX - 8, centerY - 10 + bounceY);
        ctx.lineTo(centerX - 12, centerY - 10 + bounceY);
        ctx.stroke();
        
        // 오른쪽 수염
        ctx.beginPath();
        ctx.moveTo(centerX + 8, centerY - 12 + bounceY);
        ctx.lineTo(centerX + 12, centerY - 11 + bounceY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX + 8, centerY - 10 + bounceY);
        ctx.lineTo(centerX + 12, centerY - 10 + bounceY);
        ctx.stroke();
        
        // 꼬리 (뒤쪽에)
        ctx.fillStyle = classColor;
        ctx.beginPath();
        const tailX = centerX - 10;
        const tailY = centerY + 5 + bounceY;
        ctx.arc(tailX, tailY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 발 (작은 타원들)
        ctx.fillStyle = classColor;
        // 앞발
        ctx.beginPath();
        ctx.ellipse(centerX - 4, centerY + 14 + bounceY, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(centerX + 4, centerY + 14 + bounceY, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 뒷발
        ctx.beginPath();
        ctx.ellipse(centerX - 6, centerY + 16 + bounceY, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(centerX + 6, centerY + 16 + bounceY, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 스킬 사용 중 이펙트
        if (this.animationState === "skill") {
            this.drawSkillEffect(ctx, centerX, centerY + bounceY);
        }
        
        ctx.restore();
    }
    
    drawSkillEffect(ctx, centerX, centerY) {
        const time = Date.now() * 0.01;
        ctx.save();
        
        // 마법 원 효과
        ctx.strokeStyle = this.getClassColor();
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, 20 + i * 5 + Math.sin(time + i) * 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // 반짝이는 별 효과
        ctx.fillStyle = "#FFD700";
        for (let i = 0; i < 6; i++) {
            const angle = time + i * Math.PI / 3;
            const x = centerX + Math.cos(angle) * 25;
            const y = centerY + Math.sin(angle) * 25;
            ctx.fillText("✨", x - 6, y + 3);
        }
        
        ctx.restore();
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
