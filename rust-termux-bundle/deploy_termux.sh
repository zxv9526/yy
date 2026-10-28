#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# RustChess Terminal - 棋牌大厅 Android Termux 一键编译与常驻守护脚本
# 架构: Rust (Axum + Tokio Server-Authoritative WebSocket) + Vue 3 + HTML5 Canvas
# 游戏: 经典烟三、水镜十三水、经典国标麻将三大经典国粹
# ==============================================================================

set -e

echo "[1/6] 正在配置 Termux 环境并安装 Rust 构建工具链..."
pkg update -y && pkg upgrade -y
pkg install -y rust clang make pkg-config openssl nodejs-lts git tmux termux-api

echo "[2/6] 申请 Android 唤醒锁 (阻止息屏时 WebSocket 掉线与降频)..."
if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock
  echo "  -> 已开启 termux-wake-lock 唤醒守护"
fi

# 提示用户关闭系统级 Doze 电源限制
echo "  -> 提示: 请在 Android 系统设置中将 Termux 应用电池策略设置为【无限制】避免锁屏被杀"

echo "[3/6] 配置 Cargo 针对 Android ARM64 极速编译选项..."
mkdir -p ~/.cargo
cat << 'EOF' > ~/.cargo/config.toml
[build]
jobs = 4

[target.aarch64-linux-android]
rustflags = ["-C", "target-cpu=native"]
EOF

echo "[4/6] 编译前端 Vue 3 + Canvas 产物..."
npm install --no-audit --no-fund
npm run build

echo "[5/6] 编译 Rust Axum WebSocket 服务端 (Release 权威对战引擎模式)..."
cd rust-termux-bundle
cargo build --release
cp -r ../dist ./dist
mkdir -p data
cp -n ../data/game_database.json ./data/game_database.json 2>/dev/null || true

echo "[6/6] 检查端口 3000、配置 Termux:Boot 开机自启守护并启动服务..."
# 检查并自动释放 3000 端口旧进程
if command -v fuser >/dev/null 2>&1; then
  fuser -k 3000/tcp 2>/dev/null || true
elif command -v lsof >/dev/null 2>&1; then
  OLD_PID=$(lsof -t -i:3000 2>/dev/null || true)
  if [ -n "$OLD_PID" ]; then
    kill -9 $OLD_PID 2>/dev/null || true
  fi
fi

# 配置 Termux:Boot 开机自动常驻守护脚本
BOOT_DIR="$HOME/.termux/boot"
if [ -d "$BOOT_DIR" ] || command -v termux-wake-lock >/dev/null 2>&1; then
  mkdir -p "$BOOT_DIR"
  cat << 'BOOT_EOF' > "$BOOT_DIR/start-chess.sh"
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock 2>/dev/null || true
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
CHESS_DIR="$HOME/rust-vue-canvas-game-lobby/rust-termux-bundle"
if [ -d "$CHESS_DIR" ]; then
  cd "$CHESS_DIR"
  ./target/release/mingju-termux-server >/dev/null 2>&1 &
fi
BOOT_EOF
  chmod +x "$BOOT_DIR/start-chess.sh"
  echo "  -> 已就绪 Termux:Boot 开机自启守护: ~/.termux/boot/start-chess.sh"
fi

LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' || ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)
echo "=================================================================="
echo "  棋牌大厅在 Android Termux 启动成功！(服务端权威状态机已载入)"
echo "  本机访问地址: http://127.0.0.1:3000"
echo "  局域网对局地址: http://${LAN_IP:-192.168.1.x}:3000"
echo "  WebSocket 端点: ws://${LAN_IP:-127.0.0.1}:3000/ws"
echo "  后台守护提示: 如需锁屏长效对战，请使用 tmux new -s chess 并在其中运行"
echo "  开机自启说明: 安装 Termux:Boot 插件后，手机重启将自动在后台拉起棋牌服务"
echo "=================================================================="

./target/release/mingju-termux-server
