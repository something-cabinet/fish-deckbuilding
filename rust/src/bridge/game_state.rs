use std::sync::Mutex;
use crate::core::overworld::RunState;

static RUN_STATE: Mutex<Option<RunState>> = Mutex::new(None);

pub fn set_run_state(state: RunState) {
    if let Ok(mut s) = RUN_STATE.lock() {
        *s = Some(state);
    }
}

pub fn take_run_state() -> Option<RunState> {
    if let Ok(mut s) = RUN_STATE.lock() {
        s.take()
    } else {
        None
    }
}

pub fn with_run_state<F, R>(f: F) -> Option<R>
where
    F: FnOnce(&mut RunState) -> R,
{
    if let Ok(mut s) = RUN_STATE.lock() {
        (*s).as_mut().map(f)
    } else {
        None
    }
}