// 아이템 클래스
class Item {
    constructor(itemData, level = 1, rarity = "일반") {
        this.data = itemData;
        this.name = itemData.이름;
        this.type = itemData.종류;
        this.level = level;
        this.rarity = rarity;
        this.enhancement = 0; // 강화 수치
        
        // 옵션 계산
        this.calculateOptions();
        
        // 가격 계산
        this.calculatePrice();
    }
    
    calculateOptions() {
        this.options = {};
        
        if (this.data.옵션) {
            // 기본 옵션 복사
            for (let key in this.data.옵션) {
                this.options[key] = this.data.옵션[key];
            }
            
            // 등급별 보너스 적용
            const rarityMultiplier = this.getRarityMultiplier();
            for (let key in this.options) {
                this.options[key] = Math.floor(this.options[key] * rarityMultiplier);
            }
            
            // 강화 보너스 적용
            if (this.enhancement > 0) {
                this.applyEnhancementBonus();
            }
        }
    }
    
    getRarityMultiplier() {
        switch (this.rarity) {
            case "일반": return 1.0;
            case "고급": return 1.3;
            case "희귀": return 1.6;
            case "전설": return 2.0;
            default: return 1.0;
        }
    }
    
    applyEnhancementBonus() {
        const bonusPerLevel = [8, 8, 10, 12, 15];
        
        if (this.type === "무기") {
            if (this.options.공격력) {
                for (let i = 0; i < this.enhancement; i++) {
                    this.options.공격력 += bonusPerLevel[i] || 15;
                }
            }
            if (this.options.마법력) {
                for (let i = 0; i < this.enhancement; i++) {
                    this.options.마법력 += bonusPerLevel[i] || 15;
                }
            }
        } else if (this.type === "갑옷") {
            const hpBonus = [30, 35, 40, 45, 60];
            const defBonus = [1, 1, 2, 2, 3];
            
            for (let i = 0; i < this.enhancement; i++) {
                if (this.options.HP) this.options.HP += hpBonus[i] || 60;
                if (this.options.방어력) this.options.방어력 += defBonus[i] || 3;
            }
        }
    }
    
    calculatePrice() {
        let basePrice = this.data.가격 || 100;
        
        // 등급별 가격 증가
        const rarityMultiplier = this.getRarityMultiplier();
        basePrice = Math.floor(basePrice * rarityMultiplier);
        
        // 강화별 가격 증가
        for (let i = 0; i < this.enhancement; i++) {
            basePrice = Math.floor(basePrice * 1.5);
        }
        
        this.price = basePrice;
    }
    
    enhance() {
        if (this.enhancement >= 5) return false;
        
        const cost = ECONOMY.강화비용[this.enhancement];
        if (game.player.gold < cost) return false;
        
        game.player.gold -= cost;
        this.enhancement++;
        this.calculateOptions();
        this.calculatePrice();
        
        game.addCombatLog(`${this.name} +${this.enhancement} 강화 성공!`, "exp");
        return true;
    }
    
    getDisplayName() {
        let displayName = this.name;
        
        if (this.enhancement > 0) {
            displayName += ` +${this.enhancement}`;
        }
        
        return `[${this.rarity}] ${displayName}`;
    }
    
    getTooltipText() {
        let tooltip = `${this.getDisplayName()}\n`;
        tooltip += `종류: ${this.type}\n`;
        
        if (this.data.직업제한) {
            tooltip += `직업 제한: ${this.data.직업제한}\n`;
        }
        
        tooltip += `\n옵션:\n`;
        for (let key in this.options) {
            tooltip += `${key}: +${this.options[key]}\n`;
        }
        
        if (this.data.설명) {
            tooltip += `\n${this.data.설명}`;
        }
        
        tooltip += `\n\n가격: ${this.price} 골드`;
        
        return tooltip;
    }
    
    canEquip(player) {
        if (this.data.직업제한 && this.data.직업제한 !== player.class) {
            return false;
        }
        return true;
    }
}

// 인벤토리 관리 클래스
class Inventory {
    constructor() {
        this.items = [];
        this.maxSlots = 50;
        this.consumables = {};
    }
    
    addItem(item, quantity = 1) {
        if (item.type === "소비") {
            // 소비 아이템은 수량으로 관리
            if (!this.consumables[item.name]) {
                this.consumables[item.name] = 0;
            }
            this.consumables[item.name] += quantity;
            return true;
        } else {
            // 장비 아이템은 개별 관리
            if (this.items.length >= this.maxSlots) {
                return false; // 인벤토리 가득 찬 경우
            }
            this.items.push(item);
            return true;
        }
    }
    
    removeItem(item, quantity = 1) {
        if (item.type === "소비") {
            if (this.consumables[item.name] >= quantity) {
                this.consumables[item.name] -= quantity;
                if (this.consumables[item.name] <= 0) {
                    delete this.consumables[item.name];
                }
                return true;
            }
            return false;
        } else {
            const index = this.items.indexOf(item);
            if (index !== -1) {
                this.items.splice(index, 1);
                return true;
            }
            return false;
        }
    }
    
    hasItem(itemName, quantity = 1) {
        if (this.consumables[itemName]) {
            return this.consumables[itemName] >= quantity;
        }
        return this.items.some(item => item.name === itemName);
    }
    
    getItemCount(itemName) {
        return this.consumables[itemName] || 0;
    }
    
    getEquippableItems(slotType) {
        return this.items.filter(item => 
            item.type === slotType && item.canEquip(game.player)
        );
    }
}

// 장비 관리 클래스
class Equipment {
    constructor() {
        this.slots = {
            무기: null,
            갑옷: null,
            장갑: null,
            신발: null,
            반지: null
        };
    }
    
    equip(item, slotType) {
        if (!item.canEquip(game.player)) {
            game.addCombatLog("이 직업은 해당 장비를 착용할 수 없습니다!", "system");
            return false;
        }
        
        // 기존 장비 해제
        const oldItem = this.slots[slotType];
        if (oldItem) {
            this.unequip(slotType);
        }
        
        // 새 장비 착용
        this.slots[slotType] = item;
        game.player.inventory.removeItem(item);
        
        // 능력치 적용
        this.applyItemStats(item, true);
        
        game.addCombatLog(`${item.getDisplayName()} 착용!`, "exp");
        return true;
    }
    
    unequip(slotType) {
        const item = this.slots[slotType];
        if (!item) return false;
        
        // 인벤토리에 공간 확인
        if (!game.player.inventory.addItem(item)) {
            game.addCombatLog("인벤토리가 가득 찼습니다!", "system");
            return false;
        }
        
        // 능력치 제거
        this.applyItemStats(item, false);
        
        this.slots[slotType] = null;
        game.addCombatLog(`${item.getDisplayName()} 해제!`, "system");
        return true;
    }
    
    applyItemStats(item, isEquipping) {
        const multiplier = isEquipping ? 1 : -1;
        const player = game.player;
        
        for (let stat in item.options) {
            const value = item.options[stat] * multiplier;
            
            switch (stat) {
                case "공격력":
                    player.attack += value;
                    break;
                case "마법력":
                    player.magic += value;
                    break;
                case "HP":
                    const oldMaxHP = player.maxHP;
                    player.maxHP += value;
                    // 최대 HP 증가 시 현재 HP도 증가
                    if (isEquipping && value > 0) {
                        player.currentHP += value;
                    } else if (!isEquipping && value > 0) {
                        // 장비 해제 시 현재 HP가 최대 HP를 넘지 않도록
                        player.currentHP = Math.min(player.currentHP, player.maxHP);
                    }
                    break;
                case "MP":
                    player.maxMP += value;
                    if (isEquipping && value > 0) {
                        player.currentMP += value;
                    } else if (!isEquipping && value > 0) {
                        player.currentMP = Math.min(player.currentMP, player.maxMP);
                    }
                    break;
                case "방어력":
                    player.defense += value;
                    break;
                case "마법저항":
                    player.magicResist += value;
                    break;
                case "치확":
                    player.critChance += value;
                    break;
                case "치피":
                    player.critDamage += value;
                    break;
                case "이동속도":
                    player.moveSpeed += value;
                    break;
                case "공격속도":
                    player.attackSpeed += value;
                    break;
            }
        }
    }
    
    getTotalStats() {
        const stats = {};
        
        for (let slotType in this.slots) {
            const item = this.slots[slotType];
            if (item) {
                for (let stat in item.options) {
                    if (!stats[stat]) stats[stat] = 0;
                    stats[stat] += item.options[stat];
                }
            }
        }
        
        return stats;
    }
}

// 상점 시스템
class Shop {
    constructor() {
        this.items = [];
        this.lastRefresh = 0;
        this.refreshInterval = ECONOMY.상점갱신주기;
    }
    
    initialize() {
        this.refreshShop();
    }
    
    update(deltaTime) {
        if (Date.now() - this.lastRefresh >= this.refreshInterval) {
            this.refreshShop();
        }
    }
    
    refreshShop() {
        this.items = [];
        this.lastRefresh = Date.now();
        
        // 소비 아이템 추가
        for (let itemName in ITEMS.소비아이템) {
            const itemData = ITEMS.소비아이템[itemName];
            this.items.push(new Item(itemData));
        }
        
        // 기본 무기 추가
        for (let weaponName in ITEMS.장비.무기) {
            const weaponData = ITEMS.장비.무기[weaponName];
            
            // 각 등급별로 생성
            const rarities = ["일반", "고급"];
            if (Math.random() < 0.3) rarities.push("희귀");
            if (Math.random() < 0.1) rarities.push("전설");
            
            for (let rarity of rarities) {
                this.items.push(new Item(weaponData, 1, rarity));
            }
        }
        
        // 강화 주문서 추가 (제한된 수량)
        this.items.push({
            name: "무기 강화 주문서",
            type: "특수",
            price: 500,
            quantity: 3,
            description: "무기를 즉시 +1 강화합니다"
        });
    }
    
    buyItem(item, player) {
        if (player.gold < item.price) {
            game.addCombatLog("골드가 부족합니다!", "system");
            return false;
        }
        
        if (item.type === "특수") {
            // 특수 아이템 (강화 주문서 등)
            player.gold -= item.price;
            if (!player.inventory[item.name]) {
                player.inventory[item.name] = 0;
            }
            player.inventory[item.name]++;
            item.quantity--;
            
            if (item.quantity <= 0) {
                const index = this.items.indexOf(item);
                this.items.splice(index, 1);
            }
            
            game.addCombatLog(`${item.name} 구매!`, "gold");
            return true;
        } else {
            // 일반 아이템
            if (!player.inventory.addItem(item)) {
                game.addCombatLog("인벤토리가 가득 찼습니다!", "system");
                return false;
            }
            
            player.gold -= item.price;
            game.addCombatLog(`${item.getDisplayName()} 구매!`, "gold");
            return true;
        }
    }
    
    sellItem(item, player) {
        const sellPrice = Math.floor(item.price * 0.6); // 60% 가격으로 판매
        
        if (player.inventory.removeItem(item)) {
            player.gold += sellPrice;
            game.addCombatLog(`${item.getDisplayName()} ${sellPrice}골드에 판매!`, "gold");
            return true;
        }
        
        return false;
    }
}

// 아이템 생성 유틸리티
class ItemGenerator {
    static generateRandomItem(area, rarity = null) {
        // 지역에 따른 아이템 생성
        const areaLevel = this.getAreaLevel(area);
        
        if (!rarity) {
            rarity = this.rollRarity();
        }
        
        // 무기 종류 랜덤 선택
        const weaponTypes = Object.keys(ITEMS.장비.무기);
        const weaponType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
        const weaponData = ITEMS.장비.무기[weaponType];
        
        return new Item(weaponData, areaLevel, rarity);
    }
    
    static rollRarity() {
        const roll = Math.random() * 100;
        
        if (roll < 1) return "전설";
        if (roll < 8) return "희귀";
        if (roll < 30) return "고급";
        return "일반";
    }
    
    static getAreaLevel(area) {
        const areaData = AREAS[area];
        const minLevel = areaData.추천레벨[0];
        const maxLevel = areaData.추천레벨[1];
        return Math.floor(minLevel + Math.random() * (maxLevel - minLevel + 1));
    }
    
    static generateConsumableItem(type, tier = "작") {
        const itemName = `${type} 포션(${tier})`;
        const itemData = ITEMS.소비아이템[itemName];
        
        if (itemData) {
            return new Item(itemData);
        }
        
        return null;
    }
}
