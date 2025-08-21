// 메인 게임 클래스
class Game {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.gameState = "start"; // start, playing, paused, gameOver
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // 게임 시스템들
        this.player = null;
        this.monsterManager = null;
        this.combatSystem = null;
        this.ui = null;
        this.saveSystem = null;
        this.shop = null;
        
        // 입력 관리
        this.keys = {};
        this.lastKeyPress = {};
        
        // 카메라
        this.camera = { x: 0, y: 0 };
        
        // 게임 설정
        this.selectedClass = null;
    }
    
    initialize() {
        console.log("게임 초기화 시작...");
        
        // Canvas 초기화
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.canvas || !this.ctx) {
            console.error("Canvas를 찾을 수 없습니다!");
            return false;
        }
        
        // 게임 시스템 초기화
        this.combatSystem = new CombatSystem();
        this.ui = new UIManager();
        this.saveSystem = new SaveSystem();
        this.shop = new Shop();
        this.monsterManager = new MonsterManager();
        
        // 전역 참조 설정
        window.game = this;
        window.ui = this.ui;
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 시작 화면 이벤트 설정
        this.setupStartScreen();
        
        console.log("게임 초기화 완료!");
        return true;
    }
    
    setupEventListeners() {
        // 키보드 이벤트
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            // UI가 키를 처리했으면 게임 로직은 실행하지 않음
            if (this.ui && this.ui.handleKeyPress(e.key)) {
                e.preventDefault();
                return;
            }
            
            // 게임 중에만 처리할 키들
            if (this.gameState === "playing" && this.player) {
                this.handleGameKeyDown(e.key);
            }
            
            e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // 창 포커스 이벤트
        window.addEventListener('blur', () => {
            this.keys = {}; // 포커스 잃으면 모든 키 해제
        });
        
        // 창 크기 변경 이벤트
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    setupStartScreen() {
        const classCards = document.querySelectorAll('.class-card');
        const startButton = document.getElementById('startGameButton');
        
        classCards.forEach(card => {
            card.addEventListener('click', () => {
                // 다른 카드들 선택 해제
                classCards.forEach(c => c.classList.remove('selected'));
                
                // 현재 카드 선택
                card.classList.add('selected');
                this.selectedClass = card.dataset.class;
                
                // 시작 버튼 활성화
                startButton.disabled = false;
                startButton.textContent = `${this.selectedClass}로 게임 시작`;
            });
        });
        
        startButton.addEventListener('click', () => {
            if (this.selectedClass) {
                this.startNewGame(this.selectedClass);
            }
        });
        
        // 저장된 게임이 있으면 이어하기 버튼 추가
        if (this.saveSystem && this.saveSystem.hasSaveData()) {
            const continueButton = document.createElement('button');
            continueButton.className = 'start-button';
            continueButton.textContent = '이어서 하기';
            continueButton.style.marginLeft = '20px';
            continueButton.onclick = () => this.continueGame();
            
            startButton.parentNode.appendChild(continueButton);
        }
    }
    
    startNewGame(playerClass) {
        console.log(`새 게임 시작: ${playerClass}`);
        
        // 시작 화면 숨기기
        document.getElementById('startScreen').style.display = 'none';
        
        // 플레이어 생성
        this.player = new Player(playerClass);
        
        // 게임 상태 설정
        this.gameState = "playing";
        
        // 몬스터 매니저 초기화
        this.monsterManager.initialize(this.player.currentArea);
        
        // 상점 초기화
        this.shop.initialize();
        
        // 게임 루프 시작
        this.start();
        
        // 환영 메시지
        this.addCombatLog(`${playerClass} 모험가님, 환영합니다!`, "system");
        this.addCombatLog("WASD로 이동, Space로 점프, Z로 공격하세요!", "system");
    }
    
    continueGame() {
        console.log("저장된 게임 불러오기...");
        
        if (this.saveSystem.loadGame()) {
            // 시작 화면 숨기기
            document.getElementById('startScreen').style.display = 'none';
            
            // 게임 상태 설정
            this.gameState = "playing";
            
            // 게임 루프 시작
            this.start();
            
            this.addCombatLog("저장된 게임을 불러왔습니다!", "system");
        } else {
            alert("저장된 게임을 불러오는데 실패했습니다.");
        }
    }
    
    handleGameKeyDown(key) {
        // 키 중복 입력 방지 (일부 키는 제외)
        const now = Date.now();
        if (this.lastKeyPress[key] && now - this.lastKeyPress[key] < 100) {
            if (!['ArrowLeft', 'ArrowRight', ' '].includes(key)) {
                return;
            }
        }
        this.lastKeyPress[key] = now;
        
        switch (key) {
            case KEY_BINDINGS.기본공격:
                this.player.attack();
                break;
            case KEY_BINDINGS.스킬1:
                this.player.useSkill(0);
                break;
            case KEY_BINDINGS.스킬2:
                this.player.useSkill(1);
                break;
            case KEY_BINDINGS.스킬3:
                this.player.useSkill(2);
                break;
            case KEY_BINDINGS.점프:
                this.player.jump();
                break;
        }
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
        
        console.log("게임 루프 시작!");
    }
    
    stop() {
        this.isRunning = false;
        console.log("게임 루프 정지!");
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // 게임 상태별 업데이트
        switch (this.gameState) {
            case "playing":
                this.update(this.deltaTime);
                this.render();
                break;
            case "paused":
                // 일시정지 상태에서는 UI만 업데이트
                if (this.ui) this.ui.update(this.deltaTime);
                this.render();
                break;
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
        // 입력 처리
        this.handleInput();
        
        // 플레이어 업데이트
        if (this.player) {
            this.player.update(deltaTime);
        }
        
        // 몬스터 업데이트
        if (this.monsterManager) {
            this.monsterManager.update(deltaTime, this.player);
        }
        
        // 전투 시스템 업데이트
        if (this.combatSystem) {
            this.combatSystem.update(deltaTime);
        }
        
        // UI 업데이트
        if (this.ui) {
            this.ui.update(deltaTime);
        }
        
        // 상점 업데이트
        if (this.shop) {
            this.shop.update(deltaTime);
        }
        
        // 저장 시스템 업데이트 (자동 저장)
        if (this.saveSystem) {
            this.saveSystem.update(deltaTime);
        }
        
        // 카메라 업데이트
        this.updateCamera();
    }
    
    handleInput() {
        if (!this.player || this.ui.isMenuOpen) return;
        
        // 이동 입력
        let moveDirection = 0;
        if (this.keys[KEY_BINDINGS.이동좌] || this.keys['ArrowLeft']) {
            moveDirection -= 1;
        }
        if (this.keys[KEY_BINDINGS.이동우] || this.keys['ArrowRight']) {
            moveDirection += 1;
        }
        
        this.player.move(moveDirection);
    }
    
    updateCamera() {
        if (!this.player) return;
        
        // 플레이어를 중심으로 카메라 이동 (부드럽게)
        const targetX = this.player.x - GAME_CONFIG.CANVAS_WIDTH / 2;
        const targetY = this.player.y - GAME_CONFIG.CANVAS_HEIGHT / 2;
        
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
        
        // 카메라 경계 제한
        this.camera.x = Math.max(0, Math.min(2000 - GAME_CONFIG.CANVAS_WIDTH, this.camera.x));
        this.camera.y = Math.max(0, Math.min(800 - GAME_CONFIG.CANVAS_HEIGHT, this.camera.y));
    }
    
    render() {
        // 화면 클리어
        this.ctx.fillStyle = '#2C3E50';
        this.ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        if (this.gameState !== "playing") return;
        
        // 카메라 변환 적용
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // 배경 그리기
        this.drawBackground();
        
        // 게임 오브젝트들 그리기
        if (this.monsterManager) {
            this.monsterManager.draw(this.ctx);
        }
        
        if (this.player) {
            this.player.draw(this.ctx);
        }
        
        if (this.combatSystem) {
            this.combatSystem.draw(this.ctx);
        }
        
        // 카메라 변환 해제
        this.ctx.restore();
        
        // UI 요소들 (카메라 영향 없음)
        this.drawUI();
    }
    
    drawBackground() {
        const area = AREAS[this.player.currentArea];
        if (area) {
            // 지역별 배경색
            this.ctx.fillStyle = area.배경색;
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillRect(this.camera.x, this.camera.y, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
            this.ctx.globalAlpha = 1;
        }
        
        // 지면 그리기
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, 650, 2000, 150);
        
        // 격자 그리기 (디버그용)
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.3;
        
        const startX = Math.floor(this.camera.x / 50) * 50;
        const startY = Math.floor(this.camera.y / 50) * 50;
        
        for (let x = startX; x < this.camera.x + GAME_CONFIG.CANVAS_WIDTH + 50; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.camera.y);
            this.ctx.lineTo(x, this.camera.y + GAME_CONFIG.CANVAS_HEIGHT);
            this.ctx.stroke();
        }
        
        for (let y = startY; y < this.camera.y + GAME_CONFIG.CANVAS_HEIGHT + 50; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.camera.x, y);
            this.ctx.lineTo(this.camera.x + GAME_CONFIG.CANVAS_WIDTH, y);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    drawUI() {
        // 디버그 정보
        if (this.player) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px monospace';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`FPS: ${Math.round(1000 / this.deltaTime)}`, 10, 750);
            this.ctx.fillText(`위치: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`, 10, 770);
            this.ctx.fillText(`몬스터: ${this.monsterManager.getAliveMonsters().length}마리`, 10, 790);
        }
    }
    
    handleResize() {
        // 현재는 고정 크기이므로 별도 처리 없음
        // 추후 반응형으로 만들 때 구현
    }
    
    pause() {
        if (this.gameState === "playing") {
            this.gameState = "paused";
            console.log("게임 일시정지");
        }
    }
    
    resume() {
        if (this.gameState === "paused") {
            this.gameState = "playing";
            console.log("게임 재개");
        }
    }
    
    gameOver() {
        this.gameState = "gameOver";
        console.log("게임 오버");
        
        // 게임 오버 처리
        this.addCombatLog("게임 오버! 마을에서 다시 시작하세요.", "system");
    }
    
    addCombatLog(message, type = "normal") {
        if (this.ui) {
            this.ui.addCombatLog(message, type);
        }
    }
    
    // 디버그 명령어들
    debug_giveExp(amount) {
        if (this.player) {
            this.player.gainExperience(amount);
            console.log(`경험치 ${amount} 지급`);
        }
    }
    
    debug_giveGold(amount) {
        if (this.player) {
            this.player.addGold(amount);
            console.log(`골드 ${amount} 지급`);
        }
    }
    
    debug_levelUp() {
        if (this.player) {
            this.player.levelUp();
            console.log("레벨업!");
        }
    }
    
    debug_heal() {
        if (this.player) {
            this.player.currentHP = this.player.maxHP;
            this.player.currentMP = this.player.maxMP;
            console.log("체력/마나 완전 회복");
        }
    }
}

// 게임 초기화 및 시작
let game;

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM 로드 완료, 게임 초기화 시작...");
    
    game = new Game();
    
    if (game.initialize()) {
        console.log("게임 준비 완료!");
    } else {
        console.error("게임 초기화 실패!");
    }
});

// 전역 디버그 함수들 (콘솔에서 사용 가능)
window.debug_giveExp = (amount) => game?.debug_giveExp(amount);
window.debug_giveGold = (amount) => game?.debug_giveGold(amount);
window.debug_levelUp = () => game?.debug_levelUp();
window.debug_heal = () => game?.debug_heal();
