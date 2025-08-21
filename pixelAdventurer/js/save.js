// 저장/불러오기 시스템
class SaveSystem {
    constructor() {
        this.saveKeys = {
            player: 'pixelAdventurer_player',
            inventory: 'pixelAdventurer_inventory', 
            settings: 'pixelAdventurer_settings',
            progress: 'pixelAdventurer_progress'
        };
        this.autoSaveInterval = GAME_CONFIG.AUTO_SAVE_INTERVAL;
        this.lastAutoSave = 0;
    }
    
    update(deltaTime) {
        // 자동 저장
        if (Date.now() - this.lastAutoSave >= this.autoSaveInterval) {
            this.autoSave();
        }
    }
    
    autoSave() {
        this.saveGame(true);
        this.lastAutoSave = Date.now();
    }
    
    saveGame(isAutoSave = false) {
        try {
            if (!game.player) {
                console.warn("플레이어 데이터가 없어 저장할 수 없습니다.");
                return false;
            }
            
            // 플레이어 데이터 저장
            const playerData = this.serializePlayer(game.player);
            localStorage.setItem(this.saveKeys.player, JSON.stringify(playerData));
            
            // 인벤토리 데이터 저장
            const inventoryData = this.serializeInventory(game.player);
            localStorage.setItem(this.saveKeys.inventory, JSON.stringify(inventoryData));
            
            // 진행 상황 저장
            const progressData = this.serializeProgress();
            localStorage.setItem(this.saveKeys.progress, JSON.stringify(progressData));
            
            // 설정 저장
            const settingsData = this.serializeSettings();
            localStorage.setItem(this.saveKeys.settings, JSON.stringify(settingsData));
            
            if (!isAutoSave) {
                console.log("게임이 저장되었습니다.");
            }
            return true;
            
        } catch (error) {
            console.error("게임 저장 중 오류 발생:", error);
            return false;
        }
    }
    
    loadGame() {
        try {
            // 플레이어 데이터 확인
            const playerDataString = localStorage.getItem(this.saveKeys.player);
            if (!playerDataString) {
                console.warn("저장된 게임이 없습니다.");
                return false;
            }
            
            // 플레이어 데이터 불러오기
            const playerData = JSON.parse(playerDataString);
            const inventoryDataString = localStorage.getItem(this.saveKeys.inventory);
            const inventoryData = inventoryDataString ? JSON.parse(inventoryDataString) : null;
            const progressDataString = localStorage.getItem(this.saveKeys.progress);
            const progressData = progressDataString ? JSON.parse(progressDataString) : null;
            
            // 게임 상태 복원
            this.deserializePlayer(playerData, inventoryData);
            if (progressData) {
                this.deserializeProgress(progressData);
            }
            
            console.log("게임을 불러왔습니다.");
            return true;
            
        } catch (error) {
            console.error("게임 불러오기 중 오류 발생:", error);
            return false;
        }
    }
    
    serializePlayer(player) {
        return {
            // 기본 정보
            class: player.class,
            level: player.level,
            experience: player.experience,
            skillPoints: player.skillPoints,
            gold: player.gold,
            
            // 위치
            x: player.x,
            y: player.y,
            currentArea: player.currentArea,
            
            // 능력치
            maxHP: player.maxHP,
            currentHP: player.currentHP,
            maxMP: player.maxMP,
            currentMP: player.currentMP,
            attack: player.attack,
            magic: player.magic,
            defense: player.defense,
            magicResist: player.magicResist,
            critChance: player.critChance,
            critDamage: player.critDamage,
            moveSpeed: player.moveSpeed,
            attackSpeed: player.attackSpeed,
            
            // 스킬 레벨
            skillLevels: player.skillLevels,
            
            // 저장 시간
            saveTime: Date.now(),
            version: "1.0"
        };
    }
    
    serializeInventory(player) {
        return {
            // 소비 아이템
            consumables: player.inventory.consumables || {},
            
            // 장비 아이템
            items: (player.inventory.items || []).map(item => ({
                name: item.name,
                type: item.type,
                rarity: item.rarity,
                enhancement: item.enhancement,
                options: item.options,
                price: item.price
            })),
            
            // 착용 중인 장비
            equipment: player.equipment.slots || {},
            
            // 인벤토리 설정
            maxSlots: player.inventory.maxSlots || 50
        };
    }
    
    serializeProgress() {
        return {
            // 현재 지역
            currentArea: game.player.currentArea,
            
            // 해금된 지역들
            unlockedAreas: ["초록 들판"], // 기본적으로 첫 지역은 해금
            
            // 퀘스트 진행 상황 (추후 구현)
            quests: {},
            
            // 게임 통계
            stats: {
                playTime: 0,
                monstersKilled: 0,
                itemsFound: 0,
                goldEarned: 0
            },
            
            saveTime: Date.now()
        };
    }
    
    serializeSettings() {
        return {
            // 음량 설정
            volume: {
                master: 1.0,
                sfx: 1.0,
                music: 1.0
            },
            
            // 키 바인딩
            keyBindings: KEY_BINDINGS,
            
            // 게임 설정
            graphics: {
                showDamageNumbers: true,
                showEffects: true,
                cameraShake: true
            },
            
            // 접근성 설정
            accessibility: {
                colorBlindMode: false,
                fontSize: "normal",
                highContrast: false
            },
            
            saveTime: Date.now()
        };
    }
    
    deserializePlayer(playerData, inventoryData) {
        // 새 플레이어 생성
        const player = new Player(playerData.class);
        
        // 기본 정보 복원
        player.level = playerData.level;
        player.experience = playerData.experience;
        player.skillPoints = playerData.skillPoints;
        player.gold = playerData.gold;
        
        // 위치 복원
        player.x = playerData.x;
        player.y = playerData.y;
        player.currentArea = playerData.currentArea;
        
        // 능력치 복원
        player.maxHP = playerData.maxHP;
        player.currentHP = playerData.currentHP;
        player.maxMP = playerData.maxMP;
        player.currentMP = playerData.currentMP;
        player.attack = playerData.attack;
        player.magic = playerData.magic;
        player.defense = playerData.defense;
        player.magicResist = playerData.magicResist;
        player.critChance = playerData.critChance;
        player.critDamage = playerData.critDamage;
        player.moveSpeed = playerData.moveSpeed;
        player.attackSpeed = playerData.attackSpeed;
        
        // 스킬 레벨 복원
        if (playerData.skillLevels) {
            player.skillLevels = playerData.skillLevels;
        }
        
        // 인벤토리 복원
        if (inventoryData) {
            this.deserializeInventory(player, inventoryData);
        }
        
        // 게임에 플레이어 설정
        game.player = player;
        
        // 현재 지역에 맞는 몬스터 스폰
        if (game.monsterManager) {
            game.monsterManager.initialize(player.currentArea);
        }
    }
    
    deserializeInventory(player, inventoryData) {
        // 소비 아이템 복원
        if (inventoryData.consumables) {
            player.inventory.consumables = inventoryData.consumables;
        }
        
        // 장비 아이템 복원
        player.inventory.items = [];
        if (inventoryData.items) {
            for (let itemData of inventoryData.items) {
                // 아이템 데이터에서 원본 찾기
                let originalItemData = null;
                
                // 소비 아이템에서 찾기
                if (ITEMS.소비아이템[itemData.name]) {
                    originalItemData = ITEMS.소비아이템[itemData.name];
                }
                // 장비에서 찾기
                else if (itemData.type === "무기" && ITEMS.장비.무기[itemData.name]) {
                    originalItemData = ITEMS.장비.무기[itemData.name];
                }
                
                if (originalItemData) {
                    const item = new Item(originalItemData, 1, itemData.rarity);
                    item.enhancement = itemData.enhancement || 0;
                    item.calculateOptions(); // 옵션 재계산
                    item.calculatePrice(); // 가격 재계산
                    player.inventory.items.push(item);
                }
            }
        }
        
        // 장비 복원
        if (inventoryData.equipment) {
            for (let slotType in inventoryData.equipment) {
                if (inventoryData.equipment[slotType]) {
                    // 장비 아이템 데이터에서 Item 객체 생성
                    const equipData = inventoryData.equipment[slotType];
                    let originalItemData = null;
                    
                    if (equipData.type === "무기" && ITEMS.장비.무기[equipData.name]) {
                        originalItemData = ITEMS.장비.무기[equipData.name];
                    }
                    
                    if (originalItemData) {
                        const item = new Item(originalItemData, 1, equipData.rarity);
                        item.enhancement = equipData.enhancement || 0;
                        item.calculateOptions();
                        item.calculatePrice();
                        player.equipment.slots[slotType] = item;
                    }
                }
            }
        }
        
        // 인벤토리 설정
        if (inventoryData.maxSlots) {
            player.inventory.maxSlots = inventoryData.maxSlots;
        }
    }
    
    deserializeProgress(progressData) {
        // 현재 지역 설정은 이미 플레이어에서 처리됨
        
        // 해금된 지역들 (추후 구현)
        // game.unlockedAreas = progressData.unlockedAreas || ["초록 들판"];
        
        // 퀘스트 진행 상황 (추후 구현)
        // game.quests = progressData.quests || {};
        
        // 게임 통계 (추후 구현)
        // game.stats = progressData.stats || {};
    }
    
    hasSaveData() {
        return localStorage.getItem(this.saveKeys.player) !== null;
    }
    
    deleteSaveData() {
        try {
            for (let key in this.saveKeys) {
                localStorage.removeItem(this.saveKeys[key]);
            }
            console.log("저장 데이터가 삭제되었습니다.");
            return true;
        } catch (error) {
            console.error("저장 데이터 삭제 중 오류 발생:", error);
            return false;
        }
    }
    
    exportSaveData() {
        try {
            const saveData = {};
            for (let key in this.saveKeys) {
                const data = localStorage.getItem(this.saveKeys[key]);
                if (data) {
                    saveData[key] = JSON.parse(data);
                }
            }
            
            const exportString = JSON.stringify(saveData, null, 2);
            return exportString;
        } catch (error) {
            console.error("저장 데이터 내보내기 중 오류 발생:", error);
            return null;
        }
    }
    
    importSaveData(importString) {
        try {
            const saveData = JSON.parse(importString);
            
            for (let key in this.saveKeys) {
                if (saveData[key]) {
                    localStorage.setItem(this.saveKeys[key], JSON.stringify(saveData[key]));
                }
            }
            
            console.log("저장 데이터를 가져왔습니다.");
            return true;
        } catch (error) {
            console.error("저장 데이터 가져오기 중 오류 발생:", error);
            return false;
        }
    }
    
    // 버전 호환성 검사
    checkCompatibility(saveVersion) {
        const currentVersion = "1.0";
        
        // 현재는 간단한 버전 비교만 수행
        return saveVersion === currentVersion;
    }
    
    // 마이그레이션 (추후 버전 업데이트 시 필요)
    migrateSaveData(saveData, fromVersion, toVersion) {
        // 추후 구현: 버전별 저장 데이터 변환
        return saveData;
    }
}
