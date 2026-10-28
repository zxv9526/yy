# 游戏源码结构与文件说明 (Game Files Description)

本项目专注三大经典国粹棋牌（经典烟三、水镜十三水、经典国标麻将）。以下是各游戏的**规则引擎文件（Rules Engine）**与**界面/交互组件文件（UI Components & Canvas）**的详细说明。

---

## 一、 各游戏规则引擎文件 (Rules & Logic Engines)
存放于 `/src/engine/` 目录下，负责处理牌型判断、出牌合法性验证、得分计算、胜负判定与洗牌/发牌逻辑。

1. **经典烟三规则文件**：
   - `src/engine/yansanRules.ts`
   - **说明**：经典烟三（四人争锋）正统规则引擎，方块4首出、黑桃3与黑桃A同盟、强攻全胜翻倍或翻倍全输机制、有牌必管、打和零和结算。

2. **水镜十三水规则文件**：
   - `src/engine/shisanshuiRules.ts`
   - **说明**：十三水（Chinese Poker / 罗宋）规则引擎，头墩3张、中墩5张、尾墩5张，一键智能理牌、严防倒水检测、牌型大小比较及全垒打/打枪计分逻辑。

3. **经典国标麻将规则文件**：
   - `src/engine/mahjongRules.ts`
   - **说明**：国标经典136张牌库麻将，真3D色子定庄开门、理牌摸打、碰杠听胡判定及清一色/自摸番数计算。

4. **全局游戏状态与通用类型定义**：
   - `src/engine/gameStateTypes.ts`
   - **说明**：定义了所有游戏通用的房间状态、玩家结构、游戏类型枚举 (`GameType: 'yansan' | 'shisanshui' | 'mahjong'`) 及动作交互接口。

---

## 二、 界面与视图组件文件 (UI Components & Canvas Views)
存放于 `/src/components/` 及其子目录下，负责渲染游戏舞台、动画特效、操作按钮、积分面板及场景选择。

1. **全局主入口与视图调度**：
   - `src/App.vue`
   - **说明**：主控组件。负责大厅导航、三大经典游戏模式的路由切换、全局音效控制、主题切换以及弹窗调度。

2. **游戏舞台画布组件 (Canvas Views)**：
   存放于 `/src/components/canvas/`：
   - `YansanCanvas.vue`：经典烟三游戏主舞台（方块4首出引导、强攻独胜与投降结算）。
   - `ShisanshuiCanvas.vue`：水镜十三水游戏舞台（三道摆牌、倒水检测、开牌比水与连环打枪）。
   - `MahjongCanvas.vue`：经典国标麻将舞台（3D象牙色子定庄动效、摸牌、打牌、碰杠胡动画）。

3. **场景选择弹窗组件 (Scene Selection Modals)**：
   - `MahjongSceneModal.vue`：麻将场次选择（红中6码/10码、经典6码/10码）。
   - `ShisanshuiSceneModal.vue`：十三水场次选择（四人实时/预约场、八人两副牌实时/预约场）。

4. **系统与功能弹窗组件**：
   - `AuthModal.vue`：用户登录/注册弹窗。
   - `UserProfileModal.vue`：用户个人资料与战绩统计。
   - `PointsManageModal.vue`：积分与资产管理。
    - `AchievementModal.vue`：成就系统弹窗。
    - `TermuxDeploySection.vue`：Termux proot-distro Ubuntu 部署教程及指引组件（包含 Ubuntu 一键部署脚本 deploy_ubuntu.sh、Termux 安装容器脚本 termux_install_ubuntu.sh、Node 全栈服务及 Android APK 自动化打包工作流查看与下载）。
    - `ApkDownloadModal.vue`：Android APK 客户端极速下载弹窗（内置 GHProxy、GitMirror、KKGitHub 等多条国内高速免翻墙直链，支持一键复制与即刻下载）。

---

## 三、 Android APK 自动化构建与国内加速下载 (GitHub Actions CI/CD)
- `.github/workflows/build-apk.yml`：
  - **功能**：监听仓库 `main` / `master` 分支推送。一旦代码发生更新，自动安装依赖、执行 `npm run build`、同步 Capacitor Android 原生工程，并通过 Gradle 自动编译出 Release 正式版与 Debug 调试版 APK。
  - **自动覆盖旧 APK**：
    1. 自动同步更新 GitHub Releases 标签 `latest-apk`，用新编译的 `chess-game-release.apk` 覆盖旧版本。
    2. 自动更新 GitHub Actions Artifacts。
    3. 自动向仓库分支提交覆盖 `apk/app-latest.apk`，保证永久提供最新可安装包。
  - **国内加速下载通道**：Release 发布页面及客户端弹窗自动生成 GHProxy、GitMirror、KKGitHub 镜像直链，国内网络免代理即点即下。
- `capacitor.config.json`：Capacitor 配置文件，配置 Android 原生包名 `com.guocui.chess`、应用名、HTTPS 协议与混合内容支持。
- `android/`：原生 Android Gradle 工程，预置 AndroidManifest、应用图标资源与 release debug 签名配置。
- `apk/README.md`：详细记录国内全网加速镜像下载直链格式与客户端安装说明。
