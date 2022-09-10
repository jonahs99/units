use crate::game_desc::GameDesc;
use crate::math::{truncate, Vec2};
use serde::{Deserialize, Serialize};

#[derive(Debug)]
pub struct Game {
    desc: GameDesc,
    units: Vec<Unit>,
    damages: Vec<DamageMsg>,
}

#[derive(Debug, Default)]
struct Unit {
    client: usize,
    ty: usize,
    pos: Vec2,
    vel: Vec2,
    acc: Vec2,
    disp: Vec2,
    state: UnitState,
    summon: Option<Summon>,

    hp: f32,
    reload: f32,

    new: bool,
    dead: bool,
}

#[derive(Debug, Default, PartialEq)]
enum UnitState {
    #[default]
    Idle,
    Move(Vec2),
}

#[derive(Debug, Default, PartialEq)]
struct Summon {
    unit_ty: usize,
    delay: f32,
}

// Message Types

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClientMsg {
    Commands(Vec<(usize, UnitCmd)>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UnitCmd {
    Target(Vec2),
    Summon(usize),
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
    damage: Vec<DamageMsg>,
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
    hp: f32,
    dead: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DamageMsg {
    from: usize,
    to: usize,
}

impl Game {
    pub fn new(desc: GameDesc) -> Self {
        let mut units = Vec::new();

        for (client, spawn) in desc.player_spawns.iter().enumerate() {
            for unit in &spawn.units {
                let ty = desc.units.iter().position(|u| u.key == unit.key).unwrap();
                let unit_desc = &desc.units[ty];
                units.push(Unit {
                    client,
                    ty,
                    pos: unit.pos,
                    hp: unit_desc.hp,
                    ..Default::default()
                });
            }
        }

        Self {
            desc,
            units,
            damages: vec![],
        }
    }

    // fn spawn_unit(&mut self, ty: usize, pos, client)
    // fn unspawn_unit(&mut self, id: usize)

    pub fn process_inputs(&mut self, inputs: &[(usize, ClientMsg)]) {
        for (client, input) in inputs {
            match input {
                ClientMsg::Commands(cmds) => {
                    for (id, cmd) in cmds {
                        if let Some(unit) = self.units.get_mut(*id) {
                            if unit.client != *client {
                                continue;
                            }
                            match cmd {
                                &UnitCmd::Target(pos) => {
                                    unit.state = UnitState::Move(pos);
                                }
                                &UnitCmd::Summon(summon_ty) => {
                                    let summon_key = self.desc.units[summon_ty].key.clone();
                                    let summon_descs = self.desc.units[unit.ty].summons.clone();
                                    if let Some(summon_descs) = summon_descs {
                                        let summon_desc = summon_descs
                                            .iter()
                                            .find(|summon| summon.key == summon_key);
                                        if let Some(summon_desc) = summon_desc {
                                            if unit.summon == None {
                                                unit.summon = Some(Summon {
                                                    unit_ty: summon_ty,
                                                    delay: summon_desc.time,
                                                });
                                            }
                                        }
                                    }
                                }
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
            damage: vec![],
        })
    }

    pub fn tick(&mut self) -> ServerMsg {
        let dt = self.desc.dt;

        self.remove_dead_units();

        // Update the positions based on the displacement from the last tick
        for unit in &mut self.units {
            unit.pos += unit.disp;
        }

        // Compute forces
        self.unit_forces();

        for unit in &mut self.units {
            unit.new = false;
            match unit.state {
                UnitState::Move(_target) => {
                    if unit.vel.magnitude() < 1. && unit.acc.magnitude() < 0.5 {
                        unit.state = UnitState::Idle;
                    }
                }
                _ => {}
            }
        }

        self.unit_summons();
        self.unit_attacks();

        for unit in &mut self.units {
            unit.vel += unit.acc * dt;
            unit.disp = unit.vel * dt;
        }

        ServerMsg::Update(UpdateMsg {
            unit_create: self.unit_create(),
            unit_change: self.unit_change(),
            damage: self.damages.clone(),
        })
    }

    fn unit_create(&mut self) -> Vec<UnitCreateMsg> {
        let unit_create = self
            .units
            .iter()
            .filter(|u| u.new)
            .map(|u| UnitCreateMsg {
                client: u.client,
                ty: u.ty,
            })
            .collect();

        for unit in &mut self.units {
            unit.new = false;
        }

        unit_create
    }

    fn unit_change(&self) -> Vec<UnitChangeMsg> {
        self.units
            .iter()
            .map(|u| UnitChangeMsg {
                pos: u.pos,
                disp: u.disp,
                hp: u.hp,
                dead: u.dead,
            })
            .collect()
    }

    fn remove_dead_units(&mut self) {
        self.units.retain(|unit| !unit.dead);
    }

    fn unit_forces(&mut self) {
        let dt = self.desc.dt;

        for unit in &mut self.units {
            unit.acc = Vec2::zero();
        }

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

            unit.acc += truncate(a, acc);
        }

        for i in 0..self.units.len() {
            for j in 0..self.units.len() {
                if i == j {
                    continue;
                }

                let u = &self.units[i];
                let u_size = self.desc.units[u.ty].size;

                let v = &self.units[j];
                let v_size = self.desc.units[v.ty].size;

                let d = v.pos - u.pos;
                let m = d.magnitude();

                let r0 = (u_size + v_size) / 2.;
                if m < r0 {
                    let v = &mut self.units[j];
                    v.acc += d / m * (r0 - m) * 300.;
                }
            }
        }
    }

    fn unit_summons(&mut self) {
        let dt = self.desc.dt;

        let mut units_to_spawn = Vec::new();

        for unit in &mut self.units {
            if let Some(summon) = &mut unit.summon {
                summon.delay -= dt;
                if summon.delay <= 0. {
                    units_to_spawn.push(Unit {
                        client: unit.client,
                        ty: summon.unit_ty,
                        pos: unit.pos + Vec2::new(0., 2. * self.desc.units[unit.ty].size),
                        hp: self.desc.units[summon.unit_ty].hp,
                        new: true,
                        ..Unit::default()
                    });
                    unit.summon = None;
                }
            }
        }

        // ... add units_to_spawn to the self.units
        // ... AND mark these units as "new", and update self.unit_changes to send the new units
        for unit in units_to_spawn {
            self.units.push(unit);
        }
    }

    fn unit_attacks(&mut self) {
        let dt = self.desc.dt;

        self.damages = vec![];

        for unit in &mut self.units {
            if unit.reload > 0. {
                unit.reload -= dt;
            }
        }

        for i in 0..self.units.len() {
            for j in 0..self.units.len() {
                if i == j {
                    continue;
                }
                if self.units[i].client == self.units[j].client {
                    continue;
                }

                let attacker = &self.units[i];
                if let Some(attack) = &self.desc.units[attacker.ty].attack {
                    if i == j {
                        continue;
                    }

                    let defender = &self.units[j];

                    let d = defender.pos - attacker.pos;
                    let m = d.magnitude();

                    if m < attack.range {
                        if attacker.reload <= 0. {
                            let defender = &mut self.units[j];
                            defender.hp -= attack.damage;

                            let attacker = &mut self.units[i];
                            attacker.reload = attack.delay;

                            self.damages.push(DamageMsg { from: i, to: j });
                        }
                    }
                }
            }
        }

        for unit in &mut self.units {
            if unit.hp <= 0. {
                unit.dead = true;
            }
        }
    }
}
