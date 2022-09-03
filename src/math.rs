pub type Vec2 = vek::Vec2<f32>;

pub fn truncate(v: Vec2, max_magnitude: f32) -> Vec2 {
    let m = v.magnitude();
    if m <= max_magnitude {
        v
    } else {
        v / m * max_magnitude
    }
}
