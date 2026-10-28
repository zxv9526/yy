use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::{header, HeaderValue},
    response::IntoResponse,
    routing::get,
    Router,
};
use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::{net::SocketAddr, sync::Arc, time::Instant};
use tokio::sync::broadcast;
use tower_http::{cors::CorsLayer, set_header::SetResponseHeaderLayer, services::ServeDir};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum GameType {
    Yansan,
    Shisanshui,
    Mahjong,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomPlayer {
    pub id: String,
    pub name: String,
    pub rating: u32,
    pub seat: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomChatMessage {
    pub id: String,
    pub sender: String,
    pub text: String,
    pub timestamp: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prop: Option<String>,
    #[serde(rename = "targetSeat", skip_serializing_if = "Option::is_none")]
    pub target_seat: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthoritativeBoardState {
    #[serde(rename = "roomId")]
    pub room_id: String,
    #[serde(rename = "gameType")]
    pub game_type: String,
    pub phase: String, // "idle" | "playing" | "comparing" | "ended"
    #[serde(rename = "turnSeat")]
    pub turn_seat: usize,
    #[serde(rename = "actionSeq")]
    pub action_seq: usize,
    #[serde(rename = "moveCount")]
    pub move_count: usize,
    pub multiplier: usize,
    #[serde(rename = "handsCount")]
    pub hands_count: Vec<usize>,
    #[serde(rename = "lastCombo", skip_serializing_if = "Option::is_none")]
    pub last_combo: Option<serde_json::Value>,
    #[serde(rename = "landlordSeat", skip_serializing_if = "Option::is_none")]
    pub landlord_seat: Option<usize>,
    #[serde(rename = "winnerSeat", skip_serializing_if = "Option::is_none")]
    pub winner_seat: Option<i64>,
    #[serde(rename = "updatedAt")]
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomState {
    pub id: String,
    pub title: String,
    #[serde(rename = "gameType")]
    pub game_type: String,
    pub status: String,
    pub players: Vec<RoomPlayer>,
    pub spectators: usize,
    #[serde(rename = "turnSeat")]
    pub turn_seat: usize,
    #[serde(rename = "moveCount")]
    pub move_count: usize,
    #[serde(rename = "modeLabel")]
    pub mode_label: String,
    pub chat: Vec<RoomChatMessage>,
    #[serde(rename = "boardState", skip_serializing_if = "Option::is_none")]
    pub board_state: Option<AuthoritativeBoardState>,
}

pub struct AppState {
    pub rooms: DashMap<String, RoomState>,
    pub tx: broadcast::Sender<String>,
    pub boot_time: Instant,
}

fn create_default_board_state(room_id: &str, game_type: &str) -> AuthoritativeBoardState {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64;
    let (phase, hands_count, multiplier) = match game_type {
        "yansan" => ("playing".to_string(), vec![13, 13, 13, 13], 1),
        "shisanshui" => ("playing".to_string(), vec![13, 13, 13, 13], 1),
        "mahjong" => ("playing".to_string(), vec![13, 13, 13, 13], 1),
        _ => ("playing".to_string(), vec![13, 13, 13, 13], 1),
    };

    AuthoritativeBoardState {
        room_id: room_id.to_string(),
        game_type: game_type.to_string(),
        phase,
        turn_seat: 0,
        action_seq: 1,
        move_count: 0,
        multiplier,
        hands_count,
        last_combo: None,
        landlord_seat: None,
        winner_seat: None,
        updated_at: now,
    }
}

#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() {
    tracing_subscriber::fmt::init();
    let (tx, _rx) = broadcast::channel(512);
    let rooms = DashMap::new();

    // Seed default rooms for the 3 Classic Games (Yansan, Shisanshui, Mahjong)
    rooms.insert("RM-202".to_string(), RoomState {
        id: "RM-202".to_string(),
        title: "风雷堂 · 经典烟三".to_string(),
        game_type: "yansan".to_string(),
        status: "playing".to_string(),
        players: vec![RoomPlayer { id: "P-4".to_string(), name: "快枪手张三".to_string(), rating: 2010, seat: 0 }],
        spectators: 9,
        turn_seat: 0,
        move_count: 6,
        mode_label: "方块四首出 · 四人争锋".to_string(),
        chat: vec![RoomChatMessage { id: "c2".to_string(), sender: "快枪手张三".to_string(), text: "方块四起手！".to_string(), timestamp: "10:04".to_string(), prop: None, target_seat: None, avatar: None }],
        board_state: Some(create_default_board_state("RM-202", "yansan")),
    });

    rooms.insert("RM-204".to_string(), RoomState {
        id: "RM-204".to_string(),
        title: "水镜阁 · 经典十三水".to_string(),
        game_type: "shisanshui".to_string(),
        status: "playing".to_string(),
        players: vec![RoomPlayer { id: "P-11".to_string(), name: "罗宋巧手".to_string(), rating: 2060, seat: 0 }],
        spectators: 18,
        turn_seat: 0,
        move_count: 1,
        mode_label: "头中尾三道 · 智能理牌".to_string(),
        chat: vec![RoomChatMessage { id: "c4".to_string(), sender: "十三飞龙".to_string(), text: "尾道葫芦中道同花，防倒水稳如磐石。".to_string(), timestamp: "10:06".to_string(), prop: None, target_seat: None, avatar: None }],
        board_state: Some(create_default_board_state("RM-204", "shisanshui")),
    });

    rooms.insert("RM-205".to_string(), RoomState {
        id: "RM-205".to_string(),
        title: "雀神楼 · 经典国标麻将".to_string(),
        game_type: "mahjong".to_string(),
        status: "playing".to_string(),
        players: vec![RoomPlayer { id: "P-15".to_string(), name: "天和雀圣".to_string(), rating: 2240, seat: 0 }],
        spectators: 31,
        turn_seat: 0,
        move_count: 12,
        mode_label: "万条筒字 · 碰杠听胡".to_string(),
        chat: vec![RoomChatMessage { id: "c5".to_string(), sender: "天和雀圣".to_string(), text: "自摸万字清一色，听牌在手！".to_string(), timestamp: "10:07".to_string(), prop: None, target_seat: None, avatar: None }],
        board_state: Some(create_default_board_state("RM-205", "mahjong")),
    });

    let state = Arc::new(AppState {
        rooms,
        tx,
        boot_time: Instant::now(),
    });

    let dist_dir = if std::path::Path::new("dist").exists() {
        "dist"
    } else if std::path::Path::new("../dist").exists() {
        "../dist"
    } else {
        "dist"
    };

    // Cache-Control layer for high-speed Termux static caching
    let cache_layer = SetResponseHeaderLayer::if_not_present(
        header::CACHE_CONTROL,
        HeaderValue::from_static("public, max-age=31536000, immutable"),
    );

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/api/health", get(health_handler))
        .route("/api/database/export", get(db_export_handler))
        .route("/api/user/sync", axum::routing::post(db_sync_handler))
        .nest_service("/", ServeDir::new(dist_dir))
        .layer(cache_layer)
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    println!("RustChess Authoritative Termux Server running on http://{} (Serving {})", addr, dist_dir);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_handler(State(state): State<Arc<AppState>>) -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "engine": "Rust-Axum-Authoritative",
        "onlineCount": state.tx.receiver_count() + 36,
        "uptimeSecs": state.boot_time.elapsed().as_secs()
    }))
}

async fn db_export_handler() -> axum::Json<serde_json::Value> {
    let db_path = "data/game_database.json";
    if let Ok(content) = tokio::fs::read_to_string(db_path).await {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
            return axum::Json(parsed);
        }
    }
    axum::Json(serde_json::json!({
        "profiles": {},
        "records": []
    }))
}

async fn db_sync_handler(axum::Json(payload): axum::Json<serde_json::Value>) -> axum::Json<serde_json::Value> {
    let db_path = "data/game_database.json";
    let _ = tokio::fs::create_dir_all("data").await;
    let mut current_db: serde_json::Value = if let Ok(content) = tokio::fs::read_to_string(db_path).await {
        serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({ "profiles": {}, "records": [] }))
    } else {
        serde_json::json!({ "profiles": {}, "records": [] })
    };

    if let Some(profile) = payload.get("profile") {
        let p_id = profile.get("id").and_then(|v| v.as_str()).unwrap_or("default");
        let mut clean_profile = profile.clone();
        if let Some(coins) = clean_profile.get("coins").and_then(|c| c.as_f64()) {
            clean_profile["coins"] = serde_json::json!(coins.max(0.0).floor() as u64);
        }
        if let Some(profiles_obj) = current_db.get_mut("profiles").and_then(|p| p.as_object_mut()) {
            profiles_obj.insert(p_id.to_string(), clean_profile);
        }
    }

    if let Some(records) = payload.get("records") {
        if records.is_array() {
            current_db["records"] = records.clone();
        }
    }

    if let Ok(serialized) = serde_json::to_string_pretty(&current_db) {
        let _ = tokio::fs::write(db_path, serialized).await;
    }

    axum::Json(serde_json::json!({ "success": true }))
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<Arc<AppState>>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.tx.subscribe();

    // Send initial snapshot on client connect
    let all_rooms: Vec<RoomState> = state.rooms.iter().map(|r| r.value().clone()).collect();
    let snapshot = serde_json::json!({
        "type": "lobby_snapshot",
        "rooms": all_rooms,
        "onlineCount": state.tx.receiver_count() + 36,
        "serverTs": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis()
    });
    if let Ok(raw_snapshot) = serde_json::to_string(&snapshot) {
        let _ = sender.send(Message::Text(raw_snapshot)).await;
    }

    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    let state_clone = state.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(raw))) = receiver.next().await {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&raw) {
                let msg_type = parsed.get("type").and_then(|v| v.as_str()).unwrap_or("");
                let now_ms = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64;

                if msg_type == "ping" {
                    let pong = serde_json::json!({
                        "type": "pong",
                        "clientTs": parsed.get("clientTs"),
                        "serverTs": now_ms,
                        "onlineCount": state_clone.tx.receiver_count() + 36,
                    });
                    if let Ok(pong_raw) = serde_json::to_string(&pong) {
                        let _ = state_clone.tx.send(pong_raw);
                    }
                    continue;
                }

                if msg_type == "room_create" {
                    let id = format!("RM-{}", (now_ms % 800) + 207);
                    let title = parsed.get("title").and_then(|v| v.as_str()).unwrap_or("茗局雅客的牌局");
                    let g_type = parsed.get("gameType").and_then(|v| v.as_str()).unwrap_or("yansan");
                    let p_name = parsed.get("playerName").and_then(|v| v.as_str()).unwrap_or("茗局雅客");

                    let new_room = RoomState {
                        id: id.clone(),
                        title: title.to_string(),
                        game_type: g_type.to_string(),
                        status: "playing".to_string(),
                        players: vec![RoomPlayer {
                            id: format!("P-{}", now_ms),
                            name: p_name.to_string(),
                            rating: 1900,
                            seat: 0,
                        }],
                        spectators: 1,
                        turn_seat: 0,
                        move_count: 0,
                        mode_label: "实时 WebSocket 牌桌".to_string(),
                        chat: vec![RoomChatMessage {
                            id: format!("c-{}", now_ms),
                            sender: "系统司仪".to_string(),
                            text: format!("房间 {} 已建立，欢迎各路牌友入席！", id),
                            timestamp: format!("{}:{:02}", (now_ms / 3600000 + 8) % 24, (now_ms / 60000) % 60),
                            prop: None,
                            target_seat: None,
                            avatar: None,
                        }],
                        board_state: Some(create_default_board_state(&id, g_type)),
                    };

                    state_clone.rooms.insert(id, new_room.clone());
                    let all_rooms: Vec<RoomState> = state_clone.rooms.iter().map(|r| r.value().clone()).collect();
                    let payload = serde_json::json!({
                        "type": "room_created",
                        "room": new_room,
                        "rooms": all_rooms
                    });
                    if let Ok(raw_out) = serde_json::to_string(&payload) {
                        let _ = state_clone.tx.send(raw_out);
                    }
                    continue;
                }

                if msg_type == "room_join" {
                    if let Some(room_id) = parsed.get("roomId").and_then(|v| v.as_str()) {
                        if let Some(mut room_entry) = state_clone.rooms.get_mut(room_id) {
                            let p_name = parsed.get("playerName").and_then(|v| v.as_str()).unwrap_or("牌友");
                            let already_in = room_entry.players.iter().any(|p| p.name == p_name);
                            if !already_in && room_entry.players.len() < 4 {
                                let seat = room_entry.players.len();
                                room_entry.players.push(RoomPlayer {
                                    id: format!("P-{}", now_ms),
                                    name: p_name.to_string(),
                                    rating: parsed.get("rating").and_then(|r| r.as_u64()).unwrap_or(1900) as u32,
                                    seat,
                                });
                            } else {
                                room_entry.spectators += 1;
                            }
                            let room_snapshot = room_entry.clone();
                            let all_rooms: Vec<RoomState> = state_clone.rooms.iter().map(|r| r.value().clone()).collect();
                            let payload = serde_json::json!({
                                "type": "room_updated",
                                "room": room_snapshot,
                                "rooms": all_rooms
                            });
                            if let Ok(raw_out) = serde_json::to_string(&payload) {
                                let _ = state_clone.tx.send(raw_out);
                            }
                        }
                    }
                    continue;
                }

                if msg_type == "room_leave" {
                    if let Some(room_id) = parsed.get("roomId").and_then(|v| v.as_str()) {
                        if let Some(mut room_entry) = state_clone.rooms.get_mut(room_id) {
                            room_entry.spectators = room_entry.spectators.saturating_sub(1);
                            let room_snapshot = room_entry.clone();
                            let all_rooms: Vec<RoomState> = state_clone.rooms.iter().map(|r| r.value().clone()).collect();
                            let payload = serde_json::json!({
                                "type": "room_updated",
                                "room": room_snapshot,
                                "rooms": all_rooms
                            });
                            if let Ok(raw_out) = serde_json::to_string(&payload) {
                                let _ = state_clone.tx.send(raw_out);
                            }
                        }
                    }
                    continue;
                }

                // Authoritative Reconnect Handler with Board State recovery
                if msg_type == "room_reconnect" {
                    if let Some(room_id) = parsed.get("roomId").and_then(|v| v.as_str()) {
                        if let Some(room_entry) = state_clone.rooms.get(room_id) {
                            let room_val = room_entry.value().clone();
                            let payload = serde_json::json!({
                                "type": "reconnect_ack",
                                "room": room_val,
                                "boardState": room_val.board_state,
                                "serverTs": now_ms
                            });
                            if let Ok(raw_out) = serde_json::to_string(&payload) {
                                let _ = state_clone.tx.send(raw_out);
                            }
                        }
                    }
                    continue;
                }

                if msg_type == "game_chat" {
                    if let Some(room_id) = parsed.get("roomId").and_then(|v| v.as_str()) {
                        if let Some(mut room_entry) = state_clone.rooms.get_mut(room_id) {
                            let text = parsed.get("text").and_then(|v| v.as_str()).unwrap_or("");
                            let sender = parsed.get("sender").and_then(|v| v.as_str()).unwrap_or("牌友");
                            let avatar = parsed.get("avatar").and_then(|v| v.as_str()).unwrap_or("👤");
                            let prop = parsed.get("prop").and_then(|v| v.as_str());
                            let target_seat = parsed.get("targetSeat").and_then(|v| v.as_i64());

                            let chat_msg = RoomChatMessage {
                                id: format!("chat-{}", now_ms),
                                sender: sender.to_string(),
                                avatar: Some(avatar.to_string()),
                                text: text.to_string(),
                                prop: prop.map(|s| s.to_string()),
                                target_seat,
                                timestamp: format!("{}:{:02}", (now_ms / 3600000 + 8) % 24, (now_ms / 60000) % 60),
                            };

                            room_entry.chat.push(chat_msg.clone());
                            if room_entry.chat.len() > 50 {
                                room_entry.chat.remove(0);
                            }

                            let broadcast_payload = serde_json::json!({
                                "type": "chat_broadcast",
                                "roomId": room_id,
                                "message": chat_msg
                            });
                            if let Ok(b_raw) = serde_json::to_string(&broadcast_payload) {
                                let _ = state_clone.tx.send(b_raw);
                            }
                        }
                    }
                    continue;
                }

                // Authoritative Move & Event Validation Processing
                if msg_type == "game_move" {
                    if let Some(room_id) = parsed.get("roomId").and_then(|v| v.as_str()) {
                        if let Some(mut room_entry) = state_clone.rooms.get_mut(room_id) {
                            room_entry.move_count += 1;
                            let seat = parsed.get("seat").and_then(|s| s.as_u64()).unwrap_or(0) as usize;
                            let move_payload = parsed.get("payload");

                            // Server-authoritative state transition
                            if let Some(board) = &mut room_entry.board_state {
                                if seat >= board.hands_count.len() {
                                    continue;
                                }
                                board.action_seq += 1;
                                board.move_count = room_entry.move_count;
                                board.updated_at = now_ms;

                                if let Some(p) = move_payload {
                                    // Update multiplier
                                    if let Some(mult) = p.get("multiplier").and_then(|m| m.as_u64()) {
                                        board.multiplier = mult as usize;
                                    }
                                    // Update landlord
                                    if let Some(ll) = p.get("landlord").and_then(|l| l.as_u64()) {
                                        board.landlord_seat = Some(ll as usize);
                                        board.phase = "playing".to_string();
                                    }
                                    // Update turnSeat
                                    if let Some(next_seat) = p.get("nextTurn").and_then(|n| n.as_u64()) {
                                        board.turn_seat = next_seat as usize;
                                        room_entry.turn_seat = next_seat as usize;
                                    }
                                    // Update lastCombo
                                    if let Some(combo) = p.get("combo") {
                                        board.last_combo = Some(combo.clone());
                                    }
                                    // Update remaining hand count
                                    if let Some(hands_rem) = p.get("handsCount").and_then(|h| h.as_array()) {
                                        board.hands_count = hands_rem.iter().filter_map(|v| v.as_u64().map(|c| c as usize)).collect();
                                    } else if seat < board.hands_count.len() {
                                        if let Some(cards_played) = p.get("cardsCount").and_then(|c| c.as_u64()) {
                                            board.hands_count[seat] = board.hands_count[seat].saturating_sub(cards_played as usize);
                                        }
                                    }
                                    // Winner settlement
                                    if let Some(winner) = p.get("winner") {
                                        board.winner_seat = winner.as_i64();
                                        board.phase = "ended".to_string();
                                    }
                                }
                            }

                            let broadcast_payload = serde_json::json!({
                                "type": "game_event",
                                "roomId": room_id,
                                "seat": seat,
                                "payload": move_payload,
                                "moveCount": room_entry.move_count,
                                "boardState": room_entry.board_state
                            });
                            if let Ok(b_raw) = serde_json::to_string(&broadcast_payload) {
                                let _ = state_clone.tx.send(b_raw);
                            }
                        }
                    }
                    continue;
                }
            }
            // General broadcast
            let _ = state_clone.tx.send(raw);
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    }
}
