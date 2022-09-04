use crate::math::Vec2;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameDesc {
    pub dt: f32,
    pub resources: Vec<ResourceDesc>,
    pub units: Vec<UnitDesc>,
    pub player_spawns: Vec<PlayerSpawnDesc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceDesc {
    pub key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitDesc {
    pub key: String,
    pub spawn: Option<SpawnDesc>,
    pub speed: f32,
    pub acc: f32,
    pub size: f32,
    pub hp: f32,
    pub attack: Option<AttackDesc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnDesc {
    pub from: String,
    pub cost: Vec<(i32, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttackDesc {
    pub range: f32,
    pub damage: f32,
    pub delay: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerSpawnDesc {
    pub units: Vec<UnitSpawnDesc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitSpawnDesc {
    pub key: String,
    pub pos: Vec2,
}
