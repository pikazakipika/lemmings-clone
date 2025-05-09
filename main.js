// 定数の定義
  // ゲーム内で使用する色を定義
  const COLORS = {
    ground: 0x805500, // 地面の色
    goal: 0xffffff, // ゴールの色
    trap: 0xff0000, // トラップの色
    builder: 0x00ffff, // ビルダーの色
    wall: 0xffa500, // 壁モードの色
    character: 0x00ff00, // キャラクターの色
  };

  // ゲーム内で使用するサイズを定義
  const SIZES = {
    groundHeight: 115, // 地面の高さ
    goalWidth: 60, // ゴールの幅
    goalHeight: 80, // ゴールの高さ
    trapWidth: 60, // トラップの幅
    trapHeight: 10, // トラップの高さ
    characterScale: 0.2, // キャラクターのスケール
    stairWidth: 20, // 階段の幅
    stairHeight: 5, // 階段の高さ
  };

  // キャラクターの速度を定義
  const SPEEDS = {
    character: 0.5, // 通常キャラクターの速度
    builder: 0.15, // ビルダーの速度
  };

class MainScene extends Phaser.Scene {
  preload() {
    this.load.image('character', 'assets/images/character.png');
  }

  create() {
    const door = this.add.rectangle(0, 35, 160, 95, COLORS.ground); //地面を生成
    const ground = this.add.rectangle(400, 580, 800, SIZES.groundHeight, COLORS.ground); //地面を生成
    this.physics.add.existing(ground, true); // 地面にphysics判定を付ける
    this.goal = this.add.rectangle(750, 483, SIZES.goalWidth, SIZES.goalHeight, COLORS.goal); //出口を生成
    this.physics.add.existing(this.goal, true); // ← 追加：静的な物理オブジェクトに
    this.stairs = this.physics.add.staticGroup();
    this.characters = this.physics.add.group();

    // キャラクターを定期的に生成
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.spawnCharacter(); // キャラを生成する
      },
      repeat: 49
    });

    // キャラと地面の衝突設定（ここで1回だけ）
    this.physics.add.collider(this.characters, ground);
    // キャラと階段の衝突設定（ここで1回だけ）
    this.physics.add.collider(this.characters, this.stairs);

    // トラップのグループ
    this.traps = this.physics.add.staticGroup();

    // トラップを画面中央に設置（複数でも可）
    const trap = this.add.rectangle(400, 520, SIZES.trapWidth, SIZES.trapHeight, COLORS.trap); // 幅60の赤いトラップ
    this.physics.add.existing(trap, true);
    this.traps.add(trap);

    // キャラがトラップに触れたら消滅
    this.physics.add.overlap(this.characters, this.traps, (character) => {
      character.destroy();
    });

    // ゴールの上にカウンターを表示する
    this.goalCount = 0;

    this.goalCounterText = this.add.text(this.goal.x, this.goal.y - 80, '0', {
      fontSize: '40px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 6, y: 3 }
    });
    this.goalCounterText.setOrigin(0.5);

    // キャラがゴールに触れたら消滅
    this.physics.add.overlap(this.characters, this.goal, (obj1, obj2) => {
      let char = null;

      if (this.characters.contains(obj1)) {
        char = obj1;
      } else if (this.characters.contains(obj2)) {
        char = obj2;
      }

      if (char && char.active) { // キャラクターがアクティブか確認
        // カウントダウン中ならタイマーを停止し、テキストを削除
        if (char.isExploding) {
          if (char.countdownText) {
            char.countdownText.destroy();
          }
          if (char.explodeTimer) {
            char.explodeTimer.remove(false); // タイマーを停止
          }
        }

        //キャラがゴールに触れたらカウント
        this.goalCount++;
        this.goalCounterText.setText(this.goalCount.toString());

        char.destroy();
      }
    });    

    // 役割の選択ボタンを生成
    // 状態管理
    this.buildMode = false;
    this.explodeMode = false;

    // 爆破モードボタン
    this.explodeButton = this.add.text(420, 20, '💣 ばくはつ', {
      fontSize: '30px',
      backgroundColor: '#ff4444',
      padding: { x: 15, y: 15 }
    })
    .setInteractive()
    .on('pointerdown', () => {
      this.resetModes(); // 他のモードを解除
      this.explodeMode = true; // 爆破モードを有効化
      this.updateModeButtons();
    });

    // 建設モードボタン
    this.buildButton = this.add.text(650, 20, '🪜 かいだん', {
      fontSize: '30px',
      backgroundColor: '#8888ff',
      padding: { x: 15, y: 15 }
    })
    .setInteractive()
    .on('pointerdown', () => {
      this.resetModes(); // 他のモードを解除
      this.buildMode = true; // 建設モードを有効化
      this.updateModeButtons();
    });

    // 壁モードボタン
    this.wallButton = this.add.text(250, 20, '🧱 かべ', {
      fontSize: '30px',
      backgroundColor: '#aaaaaa',
      padding: { x: 15, y: 15 }
    })
    .setInteractive()
    .on('pointerdown', () => {
      this.resetModes(); // 他のモードを解除
      this.wallMode = true; // 壁モードを有効化
      this.updateModeButtons();
    });

    // ボタンの見た目更新関数（色）
    this.updateModeButtons = () => {
      this.explodeButton.setBackgroundColor(this.explodeMode ? '#aa0000' : '#ff4444');
      this.buildButton.setBackgroundColor(this.buildMode ? '#3333aa' : '#8888ff');
      this.wallButton.setBackgroundColor(this.wallMode ? '#555555' : '#aaaaaa');
    };

    // ボタンの状態をリセットする関数
    this.resetModes = () => {
      this.explodeMode = false;
      this.buildMode = false;
      this.wallMode = false;
    };    

    const secondFloor = this.add.rectangle(450, 300, 700, 20, COLORS.ground); // 2階を生成
    this.physics.add.existing(secondFloor, true); // 2階にphysics判定を付ける

    // キャラと2階の衝突設定
    this.physics.add.collider(this.characters, secondFloor);

  }

  // キャラクターを生成する関数
  spawnCharacter() {
    const char = this.physics.add.sprite(100, 50, 'character'); // キャラクターを生成
    char.setScale(SIZES.characterScale); // キャラクターのスケールを設定
    char.setTint(COLORS.character); // 初期色を緑に設定（非ビルダー）
    char.speed = SPEEDS.character; // 初期速度を設定
    char.direction = 1; // 初期方向を右に設定
    char.isBuilder = false; // 初期状態ではビルダーではない
    char.name = `char_${this.characters.getLength()}`; // キャラクターの名前を設定

    char.setInteractive(); // キャラクターをクリック可能に設定
    char.on('pointerdown', () => {
      if (this.explodeMode) { // 爆破モードの場合
        if (char.isExploding) return; // 既に爆破中の場合は無視

        char.isExploding = true; // 爆破中フラグを設定

        const countdownText = this.add.text(char.x, char.y - 30, '3', {
          fontSize: '20px',
          color: '#ff0000',
          backgroundColor: '#000000',
          padding: { x: 4, y: 2 }
        });
        countdownText.setOrigin(0.5); // テキストの中心を基準に配置

        char.countdownText = countdownText; // カウントダウンテキストをキャラクターに関連付け

        let secondsLeft = 3;
        const timer = this.time.addEvent({
          delay: 1000,
          repeat: 2,
          callback: () => {
            if (!char.active) {
              timer.remove(false); // キャラクターが削除されていたらタイマーを停止
              return;
            }
            secondsLeft--;
            countdownText.setText(secondsLeft.toString()); // カウントダウンを更新
          }
        });

        char.explodeTimer = timer; // 爆破タイマーをキャラクターに関連付け

        this.time.delayedCall(3000, () => {
          if (!char.active) return; // キャラクターが削除されていたら爆破処理をスキップ
          countdownText.destroy(); // カウントダウンテキストを削除
          this.explodeCharacter(char); // 爆破処理を実行
        });

        this.explodeMode = true; // 爆破モードを有効化
      } else if (this.buildMode && !char.isBuilder) { // 建設モードの場合
        char.isBuilder = true; // ビルダーに設定
        char.setTint(COLORS.builder); // 水色でビルダーを示す
        char.lastStairTime = 0; // 最後に階段を作った時間を初期化
        char.speed = SPEEDS.builder; // ビルダーの速度を設定
        console.log(`${char.name} → ビルダーに変更`);
      } else if (this.wallMode) { // 壁モードの場合
        char.isWall = true; // 壁モードに設定
        char.setTint(COLORS.wall); // オレンジ色で壁を示す
        char.setVelocityX(0); // 移動を停止
        console.log(`${char.name} → 壁モードに変更`);
      }
    });

    this.characters.add(char); // キャラクターをグループに追加
  }

  update() {
    this.characters.getChildren().forEach((char) => {
      if (!char.active) return; // Skip destroyed characters

      if (char.isWall) {
        this.handleWallCharacter(char);
        return;
      }

      this.handleCharacterCollision(char);
      this.handleCharacterMovement(char);
      this.handleCharacterStairs(char);
      this.handleCharacterFalling(char);
      this.handleCharacterBounds(char);
      this.updateCountdownText(char);
    });
  }

  // 壁モードのキャラクターを処理する関数
  handleWallCharacter(char) {
    char.setVelocityX(0); // 壁モードのキャラクターは停止
  }

  // キャラクター同士の衝突を処理する関数
  handleCharacterCollision(char) {
    this.characters.getChildren().forEach((otherChar) => {
      if (otherChar === char || !otherChar.active || !otherChar.isWall) return; // 自分自身や非アクティブ、壁でないキャラクターは無視

      const dx = Math.abs(char.x - otherChar.x);
      const dy = Math.abs(char.y - otherChar.y);
      if (dx < 20 && dy < 20) { // 衝突判定
        char.direction *= -1; // 反対方向に進む
        char.setVelocityX(char.speed * char.direction * 100); // 速度を再設定
        char.flipX = char.direction < 0; // 向きを反転
        char.x += char.direction * 5; // 衝突後に少し離す
      }
    });
  }

  // キャラクターの移動を処理する関数
  handleCharacterMovement(char) {
    char.setVelocityX(char.speed * char.direction * 100); // キャラクターの速度を設定
  }

  // キャラクターが階段を作る処理を行う関数
  handleCharacterStairs(char) {
    if (char.isBuilder) { // ビルダーの場合
      const now = this.time.now;
      if (now - char.lastStairTime > 300) { // 0.3秒ごとに階段を作る
        const stairX = char.x + (char.direction > 0 ? 10 : -10);
        const stairY = char.y + 24;

        const stair = this.add.rectangle(stairX, stairY, SIZES.stairWidth, SIZES.stairHeight, 0x964B00); // 茶色の階段
        this.physics.add.existing(stair, true); // 階段に物理判定を追加
        this.stairs.add(stair);

        char.y -= 4; // ビルダーを少し上に移動して階段を登るように見せる
        char.lastStairTime = now;
      }
    } else {
      char.y -= 2.6; // 通常キャラクターの動き
    }
  }

  // キャラクターが落下する処理を行う関数
  handleCharacterFalling(char) {
    let onStair = false;
    this.stairs.getChildren().forEach((stair) => {
      const dx = Math.abs(char.x - stair.x);
      const dy = Math.abs(char.y - stair.y);
      if (dx < 15 && dy < 20) { // 階段の上にいるか判定
        onStair = true;
      }
    });

    if (!onStair && char.y < 500) {
      char.y += 2; // 落下
    }
  }

  // キャラクターが画面端に到達した際の処理を行う関数
  handleCharacterBounds(char) {
    if (char.x >= this.game.config.width - 10) {
      char.direction = -1; // 左向きに反転
      char.flipX = true;
    } else if (char.x <= 10) {
      char.direction = 1; // 右向きに反転
      char.flipX = false;
    }
  }

  // 爆破のカウントダウンテキストを更新する関数
  updateCountdownText(char) {
    if (char.countdownText) {
      char.countdownText.setPosition(char.x, char.y - 30); // テキストの位置をキャラクターに追従
    }
  }

  //キャラクターを爆破して、近くの階段に穴をあける処理
  explodeCharacter(char) {
    if (!char.active) return; // 既に消えていたら無視

    char.active = false; // キャラクターを非アクティブに設定

    // 近くの階段を削除（20px以内の範囲）
    const stairsToDestroy = []; // 削除対象の階段を一時的にリスト化
    this.stairs.getChildren().forEach((stair) => {
      const dx = Math.abs(char.x - stair.x);
      const dy = Math.abs(char.y - stair.y);
      if (dx <= 30 && dy <= 50) { // 範囲を正確に指定
        stairsToDestroy.push(stair);
      }
    });

    // リスト化した階段を削除
    stairsToDestroy.forEach((stair) => stair.destroy());

    // キャラを削除（爆破）
    char.destroy();

    // 爆発エフェクト（簡易）
    const boom = this.add.text(char.x, char.y, '💥', { fontSize: '40px' });
    this.time.delayedCall(500, () => boom.destroy());
  }
  

}  

const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  backgroundColor: '#89BDDE',
  scene: MainScene,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 500 },
      debug: true
    }
  },
};

new Phaser.Game(config);
