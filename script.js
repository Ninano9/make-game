const chatbox = document.getElementById("chatbox");
const userInput = document.getElementById("userInput");
const submitButton = document.getElementById("submitButton");
const conversationHistory = document.getElementById("conversationHistory");

// 대화 데이터 로드
const loadChatHistory = () => {
    const chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
    chatHistory.forEach((message) => {
        conversationHistory.innerHTML += `<div>${message}</div>`;
    });
};

// 메시지 전송 처리
const sendMessage = () => {
    const message = userInput.value;
    if (message.trim() === "") return;

    chatbox.innerHTML += `<div>사용자: ${message}</div>`;
    userInput.value = "";

    // AI의 응답 생성
    generateResponse(message);
};

// AI 응답 생성
const generateResponse = (userMessage) => {
    let response;

    // 간단한 대화 규칙
    if (userMessage.includes("안녕")) {
        response = "안녕하세요! 어떻게 도와드릴까요?";
    } else if (userMessage.includes("이름")) {
        response = "저는 대화형 인공지능입니다.";
    } else if (userMessage.includes("안녕히 가세요")) {
        response = "안녕히 가세요! 다음에 또 만나요.";
    } else {
        // 사용자가 질문을 했지만 AI가 대답을 모르겠을 때,
        // 새로운 질문과 답변을 학습합니다.
        response = prompt("저는 그에 대한 답변을 모르겠어요. 당신의 답변은 무엇인가요?");
        if (response) {
            saveLearnedResponse(userMessage, response);
            chatbox.innerHTML += `<div>AI: 감사합니다! 이 정보를 기억할게요.</div>`;
            return;
        } else {
            response = "죄송하지만 그에 대한 답변을 잘 모르겠어요.";
        }
    }

    chatbox.innerHTML += `<div>AI: ${response}</div>`;
    saveChatHistory(userMessage, response);
};

// 새로운 질문과 답변 저장
const saveLearnedResponse = (userMessage, aiResponse) => {
    const learnedResponses = JSON.parse(localStorage.getItem("learnedResponses")) || {};
    learnedResponses[userMessage] = aiResponse;
    localStorage.setItem("learnedResponses", JSON.stringify(learnedResponses));
};

// 대화 내역 저장
const saveChatHistory = (userMessage, aiResponse) => {
    const chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
    chatHistory.push(`사용자: ${userMessage}`, `AI: ${aiResponse}`);
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    // 대화 기록 업데이트
    conversationHistory.innerHTML += `<div>사용자: ${userMessage}</div>`;
    conversationHistory.innerHTML += `<div>AI: ${aiResponse}</div>`;
};

// AI가 기억한 응답 반환
const getLearnedResponse = (userMessage) => {
    const learnedResponses = JSON.parse(localStorage.getItem("learnedResponses")) || {};
    return learnedResponses[userMessage] || null;
};

// 이벤트 리스너 설정
submitButton.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        sendMessage();
    }
});

// 초기화
loadChatHistory();
