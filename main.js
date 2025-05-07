class MainScene extends Phaser.Scene {
  preload() {
    this.load.image('character', 'assets/images/character.png');
  }

  create() {
    const door = this.add.rectangle(0, 35, 160, 95, 0x805500); //地面を生成
    const ground = this.add.rectangle(400, 580, 1000, 115, 0x805500); //地面を生成
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

    this.physics.add.overlap(this.characters, this.goal, (obj1, obj2) => {
      if (this.characters.contains(obj1)) {
        obj1.destroy();
      } else if (this.characters.contains(obj2)) {
        obj2.destroy();
      }
    });
      }

spawnCharacter() {
  const char = this.physics.add.sprite(100, 50, 'character');
  char.setScale(0.2);
  char.setTint(0x00ff00); // 最初は緑（非ビルダー）
  char.speed = 0.5;
  char.direction = 1;
  char.isBuilder = false;
  char.setInteractive();  // ← クリック可能に
  char.on('pointerdown', () => {
    char.isBuilder = true;
    char.setTint(0x00ffff); // オレンジ色で区別
    char.lastStairTime = 0;
    char.speed = 0.15; // ビルダーは少し遅い
  });
  this.characters.add(char);
}

  update() {
    this.characters.getChildren().forEach((char) => {
      char.setVelocityX(char.speed * char.direction* 100);

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
      }
      else {
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

    });
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
