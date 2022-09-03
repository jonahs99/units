use serde::{Deserialize, Serialize};
use crate::game_desc::GameDesc;
use crate::math::Vec2;

#[derive(Debug)]
pub struct Game {
    units: Vec<Unit>,
    first_msg_sent: bool,
}

#[derive(Debug)]
struct Unit {
    client: usize,
    ty: usize,
    pos: Vec2,
    vel: Vec2,
}

// Message Types

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClientMsg {
    Commands(Vec<UnitCmd>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitCmd {
    id: usize,
    target: Option<Vec2>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ServerMsg {
    Room(RoomMsg),
    Update(UpdateMsg),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomMsg {
    pub client_id: usize,
    pub room: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMsg {
    unit_create: Vec<UnitCreateMsg>,
    unit_change: Vec<UnitChangeMsg>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitCreateMsg {
    client: usize,
    ty: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitChangeMsg {
    pos: Vec2,
    vel: Vec2,
}

impl Game {
    pub fn new(desc: GameDesc) -> Self {
        let mut units = Vec::new();

        for (client, spawn) in desc.player_spawns.iter().enumerate() {
            for unit in &spawn.units {
                let ty = desc.units.iter().position(|u| u.key == unit.key).unwrap();
                units.push(Unit {
                    client,
                    ty,
                    pos: unit.pos,
                    vel: (0., 0.).into(),
                });
            }
        }

        Self {
            units,
            first_msg_sent: false,
        }
    }

    pub fn process_inputs(&mut self, inputs: &[(usize, ClientMsg)]) {
        for (client, input) in inputs {
            match input {
                ClientMsg::Commands(cmds) => {
                    for cmd in cmds {
                        if let Some(unit) = self.units.get_mut(cmd.id) {
                            if unit.client != *client {
                                break;
                            }
                            if let Some(target) = cmd.target {
                                unit.pos = target;
                            }
                        }
                    }
                }
            }
        }
    }

    pub fn tick(&mut self) -> ServerMsg {
        let unit_create = if self.first_msg_sent {
            vec![]
        } else {
            self.units.iter()
                .map(|u| UnitCreateMsg {
                    client: u.client,
                    ty: u.ty,
                })
                .collect()
        };
        let unit_change = self.units.iter()
            .map(|u| UnitChangeMsg {
                pos: u.pos,
                vel: u.vel,
            })
            .collect();
        let msg = UpdateMsg {
            unit_create,
            unit_change,
        };
        self.first_msg_sent = true;
        ServerMsg::Update(msg)
    }
}

