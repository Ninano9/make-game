// UI 관리 시스템
class UIManager {
    constructor() {
        this.combatLog = [];
        this.maxLogEntries = 10;
        this.lastLogUpdate = 0;
        
        this.isMenuOpen = false;
        this.currentMenu = null;
        
        // UI 요소 참조
        this.elements = {
            currentHP: document.getElementById('currentHP'),
            maxHP: document.getElementById('maxHP'),
            hpBar: document.getElementById('hpBar'),
            currentMP: document.getElementById('currentMP'),
            maxMP: document.getElementById('maxMP'),
            mpBar: document.getElementById('mpBar'),
            currentExp: document.getElementById('currentExp'),
            nextLevelExp: document.getElementById('nextLevelExp'),
            expBar: document.getElementById('expBar'),
            playerLevel: document.getElementById('playerLevel'),
            playerGold: document.getElementById('playerGold'),
            currentArea: document.getElementById('currentArea'),
            characterPortrait: document.getElementById('characterPortrait'),
            statusEffects: document.getElementById('statusEffects'),
            combatLog: document.getElementById('combatLog'),
            inventoryScreen: document.getElementById('inventoryScreen'),
            mapScreen: document.getElementById('mapScreen'),
            menuScreen: document.getElementById('menuScreen')
        };
        
        // 스킬 쿨타임 요소들
        this.skillElements = {
            skill1Cooldown: document.getElementById('skill1Cooldown'),
            skill2Cooldown: document.getElementById('skill2Cooldown'),
            skill3Cooldown: document.getElementById('skill3Cooldown')
        };
    }
    
    update(deltaTime) {
        if (!game.player) return;
        
        // UI 업데이트
        this.updatePlayerStats();
        this.updateStatusEffects();
        this.updateSkillCooldowns();
        this.updateCombatLog();
    }
    
    updatePlayerStats() {
        const player = game.player;
        
        // HP 업데이트
        this.elements.currentHP.textContent = Math.ceil(player.currentHP);
        this.elements.maxHP.textContent = Math.ceil(player.maxHP);
        const hpPercent = (player.currentHP / player.maxHP) * 100;
        this.elements.hpBar.style.width = `${hpPercent}%`;
        
        // MP 업데이트
        this.elements.currentMP.textContent = Math.ceil(player.currentMP);
        this.elements.maxMP.textContent = Math.ceil(player.maxMP);
        const mpPercent = (player.currentMP / player.maxMP) * 100;
        this.elements.mpBar.style.width = `${mpPercent}%`;
        
        // 경험치 업데이트
        this.elements.currentExp.textContent = player.experience;
        const nextLevelExp = LEVEL_REQUIREMENTS[player.level] || 0;
        this.elements.nextLevelExp.textContent = nextLevelExp;
        const expPercent = nextLevelExp > 0 ? (player.experience / nextLevelExp) * 100 : 100;
        this.elements.expBar.style.width = `${expPercent}%`;
        
        // 레벨과 골드
        this.elements.playerLevel.textContent = player.level;
        this.elements.playerGold.textContent = player.gold;
        
        // 현재 지역
        this.elements.currentArea.textContent = player.currentArea;
        
        // 캐릭터 초상화
        this.elements.characterPortrait.textContent = player.classData.아이콘;
    }
    
    updateStatusEffects() {
        const player = game.player;
        const container = this.elements.statusEffects;
        
        // 기존 상태 효과 제거
        container.innerHTML = '';
        
        // 새 상태 효과 추가
        for (let effect of player.statusEffects) {
            const statusInfo = STATUS_EFFECTS[effect.type];
            if (statusInfo) {
                const statusDiv = document.createElement('div');
                statusDiv.className = 'status-effect';
                statusDiv.style.backgroundColor = statusInfo.색상;
                statusDiv.textContent = `${statusInfo.아이콘} ${Math.ceil(effect.duration / 1000)}s`;
                statusDiv.title = statusInfo.이름;
                container.appendChild(statusDiv);
            }
        }
    }
    
    updateSkillCooldowns() {
        const player = game.player;
        
        for (let i = 1; i <= 3; i++) {
            const skillKey = `스킬${i}`;
            const cooldownElement = this.skillElements[`skill${i}Cooldown`];
            
            if (player.skillCooldowns[skillKey] > 0) {
                const cooldownSeconds = Math.ceil(player.skillCooldowns[skillKey] / 1000);
                cooldownElement.textContent = cooldownSeconds;
                cooldownElement.style.display = 'block';
            } else {
                cooldownElement.style.display = 'none';
            }
        }
    }
    
    updateCombatLog() {
        if (Date.now() - this.lastLogUpdate < 100) return;
        
        const logContainer = this.elements.combatLog;
        
        // 최신 로그 항목들만 표시
        const recentLogs = this.combatLog.slice(-this.maxLogEntries);
        
        logContainer.innerHTML = '';
        for (let logEntry of recentLogs) {
            const logDiv = document.createElement('div');
            logDiv.className = `log-entry log-${logEntry.type}`;
            logDiv.textContent = logEntry.message;
            logContainer.appendChild(logDiv);
        }
        
        // 스크롤을 최하단으로
        logContainer.scrollTop = logContainer.scrollHeight;
        
        this.lastLogUpdate = Date.now();
    }
    
    addCombatLog(message, type = "normal") {
        this.combatLog.push({
            message: message,
            type: type,
            timestamp: Date.now()
        });
        
        // 로그가 너무 많으면 오래된 것 제거
        if (this.combatLog.length > 50) {
            this.combatLog.shift();
        }
    }
    
    openMenu(menuType) {
        this.closeAllMenus();
        
        this.isMenuOpen = true;
        this.currentMenu = menuType;
        
        switch (menuType) {
            case "inventory":
                this.openInventory();
                break;
            case "map":
                this.openMap();
                break;
            case "menu":
                this.openGameMenu();
                break;
        }
    }
    
    closeAllMenus() {
        this.isMenuOpen = false;
        this.currentMenu = null;
        
        this.elements.inventoryScreen.style.display = 'none';
        this.elements.mapScreen.style.display = 'none';
        this.elements.menuScreen.style.display = 'none';
    }
    
    openInventory() {
        this.elements.inventoryScreen.style.display = 'block';
        this.updateInventoryDisplay();
    }
    
    updateInventoryDisplay() {
        const content = document.getElementById('inventoryContent');
        if (!content) return;
        
        const player = game.player;
        content.innerHTML = '';
        
        // 장비 슬롯 표시
        const equipmentDiv = document.createElement('div');
        equipmentDiv.innerHTML = '<h3>장착 중인 장비</h3>';
        
        for (let slotType in player.equipment.slots) {
            const item = player.equipment.slots[slotType];
            const slotDiv = document.createElement('div');
            slotDiv.style.margin = '5px 0';
            slotDiv.style.padding = '5px';
            slotDiv.style.border = '1px solid #666';
            slotDiv.style.borderRadius = '3px';
            
            if (item) {
                slotDiv.innerHTML = `<strong>${slotType}:</strong> ${item.getDisplayName()}`;
                slotDiv.style.backgroundColor = 'rgba(100, 100, 100, 0.3)';
                
                // 클릭으로 장비 해제
                slotDiv.style.cursor = 'pointer';
                slotDiv.onclick = () => {
                    player.equipment.unequip(slotType);
                    this.updateInventoryDisplay();
                };
            } else {
                slotDiv.innerHTML = `<strong>${slotType}:</strong> <em>비어있음</em>`;
                slotDiv.style.backgroundColor = 'rgba(50, 50, 50, 0.3)';
            }
            
            equipmentDiv.appendChild(slotDiv);
        }
        
        content.appendChild(equipmentDiv);
        
        // 인벤토리 아이템 표시
        const inventoryDiv = document.createElement('div');
        inventoryDiv.innerHTML = '<h3>인벤토리</h3>';
        
        // 소비 아이템
        const consumableDiv = document.createElement('div');
        consumableDiv.innerHTML = '<h4>소비 아이템</h4>';
        
        for (let itemName in player.inventory.consumables) {
            const count = player.inventory.consumables[itemName];
            if (count > 0) {
                const itemDiv = document.createElement('div');
                itemDiv.innerHTML = `${itemName}: ${count}개`;
                itemDiv.style.padding = '3px';
                itemDiv.style.margin = '2px 0';
                itemDiv.style.backgroundColor = 'rgba(0, 100, 0, 0.2)';
                itemDiv.style.borderRadius = '3px';
                consumableDiv.appendChild(itemDiv);
            }
        }
        
        inventoryDiv.appendChild(consumableDiv);
        
        // 장비 아이템
        const equipDiv = document.createElement('div');
        equipDiv.innerHTML = '<h4>장비 아이템</h4>';
        
        for (let item of player.inventory.items) {
            const itemDiv = document.createElement('div');
            itemDiv.innerHTML = item.getDisplayName();
            itemDiv.style.padding = '5px';
            itemDiv.style.margin = '3px 0';
            itemDiv.style.backgroundColor = this.getRarityColor(item.rarity);
            itemDiv.style.borderRadius = '3px';
            itemDiv.style.cursor = 'pointer';
            itemDiv.title = item.getTooltipText();
            
            // 클릭으로 장비 착용
            itemDiv.onclick = () => {
                if (item.canEquip(player)) {
                    player.equipment.equip(item, item.type);
                    this.updateInventoryDisplay();
                } else {
                    this.addCombatLog("이 장비를 착용할 수 없습니다!", "system");
                }
            };
            
            equipDiv.appendChild(itemDiv);
        }
        
        inventoryDiv.appendChild(equipDiv);
        content.appendChild(inventoryDiv);
    }
    
    getRarityColor(rarity) {
        switch (rarity) {
            case "일반": return "rgba(200, 200, 200, 0.2)";
            case "고급": return "rgba(100, 100, 255, 0.2)";
            case "희귀": return "rgba(200, 100, 255, 0.2)";
            case "전설": return "rgba(255, 200, 100, 0.2)";
            default: return "rgba(100, 100, 100, 0.2)";
        }
    }
    
    openMap() {
        this.elements.mapScreen.style.display = 'block';
        this.updateMapDisplay();
    }
    
    updateMapDisplay() {
        const content = document.getElementById('mapContent');
        if (!content) return;
        
        content.innerHTML = '<h3>지역 정보</h3>';
        
        for (let areaName in AREAS) {
            const areaData = AREAS[areaName];
            const areaDiv = document.createElement('div');
            areaDiv.style.margin = '10px 0';
            areaDiv.style.padding = '10px';
            areaDiv.style.border = '2px solid #666';
            areaDiv.style.borderRadius = '5px';
            areaDiv.style.backgroundColor = areaData.배경색 + '20';
            
            if (game.player.currentArea === areaName) {
                areaDiv.style.borderColor = '#ffff00';
                areaDiv.style.boxShadow = '0 0 10px rgba(255, 255, 0, 0.5)';
            }
            
            areaDiv.innerHTML = `
                <h4>${areaData.이름}</h4>
                <p>추천 레벨: ${areaData.추천레벨[0]}-${areaData.추천레벨[1]}</p>
                <p>몬스터: ${areaData.몬스터.join(', ')}</p>
                <p>특성: ${areaData.특성}</p>
            `;
            
            // 지역 이동 (나중에 구현)
            if (game.player.currentArea !== areaName) {
                areaDiv.style.cursor = 'pointer';
                areaDiv.onclick = () => {
                    // 지역 이동 로직
                    this.addCombatLog("지역 이동 기능은 준비 중입니다!", "system");
                };
            }
            
            content.appendChild(areaDiv);
        }
    }
    
    openGameMenu() {
        this.elements.menuScreen.style.display = 'block';
        this.updateGameMenuDisplay();
    }
    
    updateGameMenuDisplay() {
        const content = document.getElementById('menuContent');
        if (!content) return;
        
        content.innerHTML = `
            <div style="text-align: center;">
                <button onclick="ui.saveGame()" style="margin: 10px; padding: 10px 20px; font-size: 16px;">게임 저장</button>
                <button onclick="ui.loadGame()" style="margin: 10px; padding: 10px 20px; font-size: 16px;">게임 불러오기</button>
                <button onclick="ui.goToMainMenu()" style="margin: 10px; padding: 10px 20px; font-size: 16px;">메인 메뉴로</button>
                <button onclick="ui.showSettings()" style="margin: 10px; padding: 10px 20px; font-size: 16px;">설정</button>
            </div>
        `;
    }
    
    saveGame() {
        if (game.saveSystem) {
            const success = game.saveSystem.saveGame();
            if (success) {
                this.addCombatLog("게임이 저장되었습니다!", "system");
            } else {
                this.addCombatLog("게임 저장에 실패했습니다!", "system");
            }
        }
    }
    
    loadGame() {
        if (game.saveSystem) {
            const success = game.saveSystem.loadGame();
            if (success) {
                this.addCombatLog("게임을 불러왔습니다!", "system");
                this.closeAllMenus();
            } else {
                this.addCombatLog("게임 불러오기에 실패했습니다!", "system");
            }
        }
    }
    
    goToMainMenu() {
        if (confirm("정말로 메인 메뉴로 돌아가시겠습니까? 저장하지 않은 진행상황은 잃어버립니다!")) {
            window.location.href = '../index.html';
        }
    }
    
    showSettings() {
        this.addCombatLog("설정 기능은 준비 중입니다!", "system");
    }
    
    // 키보드 이벤트 처리
    handleKeyPress(key) {
        if (this.isMenuOpen) {
            if (key === KEY_BINDINGS.메뉴) {
                this.closeAllMenus();
            }
            return true; // 메뉴가 열려있으면 다른 키 입력 차단
        }
        
        switch (key) {
            case KEY_BINDINGS.인벤토리:
                this.openMenu("inventory");
                return true;
            case KEY_BINDINGS.맵:
                this.openMenu("map");
                return true;
            case KEY_BINDINGS.메뉴:
                this.openMenu("menu");
                return true;
            case KEY_BINDINGS.체력포션:
                game.player.usePotion("hp");
                return true;
            case KEY_BINDINGS.마나포션:
                game.player.usePotion("mp");
                return true;
        }
        
        return false; // 처리하지 않은 키
    }
}

// 전역 UI 함수들 (HTML에서 호출)
function closeMenu() {
    if (window.ui) {
        ui.closeAllMenus();
    }
}

function saveGame() {
    if (window.ui) {
        ui.saveGame();
    }
}

function loadGame() {
    if (window.ui) {
        ui.loadGame();
    }
}

function goToMainMenu() {
    if (window.ui) {
        ui.goToMainMenu();
    }
}
