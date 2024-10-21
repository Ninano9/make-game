let model; // 모델을 저장할 변수

// 모델 생성 및 훈련 함수
async function createModel() {
    // Sequential 모델 생성
    model = tf.sequential();

    // 입력층 추가
    model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [2] }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' })); // 출력층

    // 모델 컴파일
    model.compile({ loss: 'binaryCrossentropy', optimizer: 'adam', metrics: ['accuracy'] });

    // 가상의 데이터로 모델 훈련
    const xs = tf.tensor2d([[1, 0], [0, 1], [1, 1], [0, 0]]); // 입력 데이터
    const ys = tf.tensor2d([[1], [0], [1], [0]]); // 출력 데이터 (예, 아니오)

    await model.fit(xs, ys, { epochs: 100 });
}

// 예측 함수
async function predict(input) {
    const inputTensor = tf.tensor2d([input], [1, 2]);
    const prediction = model.predict(inputTensor);
    return prediction.dataSync()[0] > 0.5 ? "예" : "아니오"; // 0.5 기준으로 예/아니오 결정
}

// 모델 생성 호출
createModel();
