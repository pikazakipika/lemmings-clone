class MainScene extends Phaser.Scene {
  preload() {
    this.load.image('character', 'assets/images/character.png');
  }

  create() {
    const door = this.add.rectangle(0, 35, 160, 95, 0x805500); //地面を生成
    const ground = this.add.rectangle(400, 580, 800, 115, 0x805500); //地面を生成
    this.physics.add.existing(ground, true); // 地面にphysics判定を付ける
    this.goal = this.add.rectangle(750, 483, 60, 80, 0xffffff); //出口を生成
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
    const trap = this.add.rectangle(400, 520, 60, 10, 0xff0000); // 幅60の赤いトラップ
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
    
      if (char) {
        //キャラがゴールに触れたらカウント
        this.goalCount++;
        this.goalCounterText.setText(this.goalCount.toString());
    
        if (char.countdownText) {
          char.countdownText.destroy();
        }
    
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
      this.explodeMode = !this.explodeMode;
      this.buildMode = false; // 建設モードは解除
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
      this.buildMode = !this.buildMode;
      this.explodeMode = false; // 爆破モードは解除
      this.updateModeButtons();
    });

    // ボタンの見た目更新関数（色）
    this.updateModeButtons = () => {
      this.explodeButton.setBackgroundColor(this.explodeMode ? '#aa0000' : '#ff4444');
      this.buildButton.setBackgroundColor(this.buildMode ? '#3333aa' : '#8888ff');
    };    

  }

  spawnCharacter() {
    const char = this.physics.add.sprite(100, 50, 'character');
    char.setScale(0.2);
    char.setTint(0x00ff00); // 最初は緑（非ビルダー）
    char.speed = 0.5;
    char.direction = 1;
    char.isBuilder = false;
    char.name = `char_${this.characters.getLength()}`;

    char.setInteractive();
    char.on('pointerdown', () => {
      if (this.explodeMode) {
        // すでにカウントが始まってたら無視
        if (char.isExploding) return;
      
        char.isExploding = true;
      
        // カウントダウン表示を作成（キャラの上）
        const countdownText = this.add.text(char.x, char.y - 30, '3', {
          fontSize: '20px',
          color: '#ff0000',
          backgroundColor: '#000000',
          padding: { x: 4, y: 2 }
        });
        countdownText.setOrigin(0.5);
      
        char.countdownText = countdownText;
      
        // カウントを1秒ごとに更新
        let secondsLeft = 3;
        const timer = this.time.addEvent({
          delay: 1000,
          repeat: 2, // 2回更新すれば 3→2→1
          callback: () => {
            secondsLeft--;
            countdownText.setText(secondsLeft.toString());
          }
        });
      
        // 3秒後に爆破
        this.time.delayedCall(3000, () => {
          countdownText.destroy(); // テキスト削除
          this.explodeCharacter(char); // 爆破
        });
      
        // モードOFF（任意：1体限定なら）
        this.explodeMode = true;
      } else if (this.buildMode && !char.isBuilder) {
        char.isBuilder = true;
        char.setTint(0x00ffff); // 水色でビルダー
        char.lastStairTime = 0;
        char.speed = 0.15;
        console.log(`${char.name} → ビルダーに変更`);
      }
    });

    this.characters.add(char);
  }

  update() {
    this.characters.getChildren().forEach((char) => {
      if (!char.active) return; // Skip destroyed characters

      char.setVelocityX(char.speed * char.direction * 100);

      // 階段を作る処理（ビルダーのみ）
      if (char.isBuilder) {
        const now = this.time.now;
        if (now - char.lastStairTime > 300) { // 0.3秒ごとに階段を作る
          const stairX = char.x + (char.direction > 0 ? 10 : -10);
          const stairY = char.y + 24;

          const stair = this.add.rectangle(stairX, stairY, 20, 5, 0x964B00); // 茶色の階段
          this.physics.add.existing(stair, true); // ← これを追加（静的オブジェクト）
          this.stairs.add(stair);

          // ビルダーを少し上に移動して階段を登るように見せる
          char.y -= 4;

          char.lastStairTime = now;
        }
      } else {
        // ビルダーを少し上に移動して階段を登るように見せる
        char.y -= 2.6;
      }

      // キャラが階段の上にいれば、落下しない
      let onStair = false;
      this.stairs.getChildren().forEach((stair) => {
        const dx = Math.abs(char.x - stair.x);
        const dy = Math.abs(char.y - stair.y);
        if (dx < 15 && dy < 20) {
          onStair = true;
        }
      });

      if (!onStair && char.y < 500) {
        char.y += 2; // 落下
      }

      // 画面端で跳ね返る
      if (char.x >= this.game.config.width - 10) {
        char.direction = -1;
        char.flipX = true; // 左向き
      } else if (char.x <= 10) {
        char.direction = 1;
        char.flipX = false; // 右向き
      }
      
      // 爆発カウンターが追従する
      if (char.countdownText) {
        char.countdownText.setPosition(char.x, char.y - 30);
      }

    });
  }

  //キャラクターを爆破して、近くの階段に穴をあける処理
  explodeCharacter(char) {
    if (!char.active) return; // 既に消えていたら無視
  
    // 近くの階段を削除（10px以内など）
    this.stairs.getChildren().forEach((stair) => {
      const dx = Math.abs(char.x - stair.x);
      const dy = Math.abs(char.y - stair.y);
      if (dx < 120 && dy < 120) {
        stair.destroy();
      }
    });
  
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
