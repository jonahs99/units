use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameDesc {
    resources: Vec<ResourceDesc>,
    units: Vec<UnitDesc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceDesc {
    key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitDesc {
    key: String,
    spawn: Option<SpawnDesc>,
    speed: f32,
    attack: Option<AttackDesc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnDesc {
    from: String,
    cost: Vec<(i32, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttackDesc {
    range: f32,
}
