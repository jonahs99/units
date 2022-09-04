use crate::game_desc::GameDesc;
use crate::math::{truncate, Vec2};
use serde::{Deserialize, Serialize};

#[derive(Debug)]
pub struct Game {
    desc: GameDesc,
    units: Vec<Unit>,
}

#[derive(Debug, Default)]
struct Unit {
    client: usize,
    ty: usize,
    pos: Vec2,
    vel: Vec2,
    disp: Vec2,
    state: UnitState,
}

#[derive(Debug, Default)]
enum UnitState {
    #[default]
    Idle,
    Move(Vec2),
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
    disp: Vec2,
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
                    ..Default::default()
                });
            }
        }

        Self { desc, units }
    }

    pub fn process_inputs(&mut self, inputs: &[(usize, ClientMsg)]) {
        for (client, input) in inputs {
            match input {
                ClientMsg::Commands(cmds) => {
                    for cmd in cmds {
                        if let Some(unit) = self.units.get_mut(cmd.id) {
                            if unit.client != *client {
                                continue;
                            }
                            if let Some(target) = cmd.target {
                                unit.state = UnitState::Move(target);
                            }
                        }
                    }
                }
            }
        }
    }

    pub fn catchup_msg(&self) -> ServerMsg {
        let unit_create = self
            .units
            .iter()
            .map(|u| UnitCreateMsg {
                client: u.client,
                ty: u.ty,
            })
            .collect();
        ServerMsg::Update(UpdateMsg {
            unit_create,
            unit_change: self.unit_change(),
        })
    }

    pub fn tick(&mut self) -> ServerMsg {
        let dt = self.desc.dt;

        // Update the positions based on the displacement from the last tick
        for unit in &mut self.units {
            unit.pos += unit.disp;
        }

        // Compute forces
        for unit in &mut self.units {
            let speed = self.desc.units[unit.ty].speed;
            let acc = self.desc.units[unit.ty].acc;

            let stop_dist = speed * speed / acc * 0.75;

            let a = match unit.state {
                UnitState::Idle => unit.vel * -10.,
                UnitState::Move(target) => {
                    let d = target - unit.pos;
                    let m = d.magnitude();

                    if m < 0.001 {
                        unit.state = UnitState::Idle;
                        Vec2::zero()
                    } else {
                        let speed_want = (speed * m / stop_dist).min(speed);
                        let v_want = d / m * speed_want;
                        let steer = (v_want - unit.vel) / dt;
                        steer
                    }
                }
            };

            unit.vel += truncate(a, acc) * dt;
        }

        for i in 0..self.units.len() {
            for j in 0..self.units.len() {
                if i == j { continue; }

                let u = &self.units[i];
                let u_size = self.desc.units[u.ty].size;

                let v = &self.units[j];
                let v_size = self.desc.units[v.ty].size;

                let d = v.pos - u.pos;
                let m = d.magnitude();

                let r0 = (u_size + v_size) / 2.;
                if m < r0 {
                    let v = &mut self.units[j];
                    v.vel += d / m * (r0 - m) * 10.;
                }
            }
        }

        for unit in &mut self.units {
            unit.disp = unit.vel * dt;
        }

        ServerMsg::Update(UpdateMsg {
            unit_create: vec![],
            unit_change: self.unit_change(),
        })
    }

    fn unit_change(&self) -> Vec<UnitChangeMsg> {
        self.units
            .iter()
            .map(|u| UnitChangeMsg {
                pos: u.pos,
                disp: u.disp,
            })
            .collect()
    }
}
