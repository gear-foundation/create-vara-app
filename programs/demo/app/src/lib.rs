#![no_std]
#![allow(static_mut_refs)]

use sails_rs::{
    gstd::{exec, msg, service},
    prelude::*,
};

const MAX_MESSAGES: usize = 100;
const MAX_MESSAGE_LENGTH: usize = 256;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

#[derive(Default)]
pub struct DemoState {
    pub counter: u64,
    pub messages: Vec<StoredMessage>,
    pub last_caller: Option<ActorId>,
    pub ping_count: u64,
}

static mut STATE: Option<DemoState> = None;

fn state() -> &'static DemoState {
    unsafe { STATE.as_ref().expect("DemoState not initialized") }
}

fn state_mut() -> &'static mut DemoState {
    unsafe { STATE.as_mut().expect("DemoState not initialized") }
}

fn seed() {
    unsafe {
        STATE = Some(DemoState::default());
    }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, Encode, Decode, TypeInfo, ReflectHash)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
#[reflect_hash(crate = sails_rs::sails_reflect_hash)]
pub struct StoredMessage {
    pub sender: ActorId,
    pub text: String,
    pub block_height: u32,
}

#[derive(Clone, Debug, Encode, Decode, TypeInfo, ReflectHash)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
#[reflect_hash(crate = sails_rs::sails_reflect_hash)]
pub struct StateView {
    pub counter: u64,
    pub last_caller: Option<ActorId>,
    pub ping_count: u64,
    pub message_count: u32,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
#[derive(Encode, Decode, TypeInfo, ReflectHash)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
#[reflect_hash(crate = sails_rs::sails_reflect_hash)]
pub enum DemoEvents {
    Incremented {
        new_value: u64,
        caller: ActorId,
    },
    MessageSent {
        sender: ActorId,
        text: String,
    },
    PingScheduled {
        delay: u32,
    },
    PingReceived {
        ping_count: u64,
    },
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct DemoService(());

impl DemoService {
    pub fn new() -> Self {
        Self(())
    }
}

#[service(events = DemoEvents)]
impl DemoService {
    // -- Commands --
    // ADD YOUR COMMANDS HERE (copy this pattern)

    /// Increment the counter by 1. Returns the new value.
    #[export]
    pub fn increment(&mut self) -> u64 {
        let s = state_mut();
        s.counter += 1;
        let caller = msg::source();
        s.last_caller = Some(caller);
        self.emit_event(DemoEvents::Incremented {
            new_value: s.counter,
            caller,
        })
        .expect("Failed to emit event");
        s.counter
    }

    /// Store a message on-chain. Max 256 chars, non-empty.
    #[export]
    pub fn send_message(&mut self, text: String) -> String {
        if text.is_empty() {
            panic!("Message cannot be empty");
        }
        if text.len() > MAX_MESSAGE_LENGTH {
            panic!("Message exceeds 256 character limit");
        }

        let s = state_mut();
        let sender = msg::source();
        let block_height = exec::block_height();

        let stored = StoredMessage {
            sender,
            text: text.clone(),
            block_height,
        };

        // Ring buffer: evict oldest when at capacity
        if s.messages.len() >= MAX_MESSAGES {
            s.messages.remove(0);
        }
        s.messages.push(stored);

        self.emit_event(DemoEvents::MessageSent { sender, text })
            .expect("Failed to emit event");
        format!("Message stored. Total: {}", s.messages.len())
    }

    /// Send a delayed message to self that triggers handle_ping after `delay` blocks.
    #[export]
    pub fn schedule_ping(&mut self, delay: u32) {
        if delay == 0 {
            panic!("Delay must be at least 1 block");
        }

        // Encode the Sails route payload for Demo::HandlePing
        let payload = ["Demo".encode(), "HandlePing".encode()].concat();

        msg::send_bytes_with_gas_delayed(
            exec::program_id(),
            payload,
            5_000_000_000,
            0,
            delay,
        )
        .expect("Failed to schedule delayed message");

        self.emit_event(DemoEvents::PingScheduled { delay })
            .expect("Failed to emit event");
    }

    /// Internal handler for delayed ping messages. Only callable by the program itself.
    #[export]
    pub fn handle_ping(&mut self) {
        if msg::source() != exec::program_id() {
            panic!("Unauthorized: only the program itself can call handle_ping");
        }

        let s = state_mut();
        s.ping_count += 1;
        self.emit_event(DemoEvents::PingReceived {
            ping_count: s.ping_count,
        })
        .expect("Failed to emit event");
    }

    // -- Queries --
    // ADD YOUR QUERIES HERE (copy this pattern)

    /// Get a summary of the current state.
    #[export]
    pub fn get_state(&self) -> StateView {
        let s = state();
        StateView {
            counter: s.counter,
            last_caller: s.last_caller,
            ping_count: s.ping_count,
            message_count: s.messages.len() as u32,
        }
    }

    /// Get the current counter value.
    #[export]
    pub fn get_counter(&self) -> u64 {
        state().counter
    }

    /// Get stored messages (last 100).
    #[export]
    pub fn get_messages(&self) -> Vec<StoredMessage> {
        state().messages.clone()
    }
}

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

#[derive(Default)]
pub struct Program(());

#[program]
impl Program {
    /// Constructor: initializes program state.
    pub fn new() -> Self {
        seed();
        Self(())
    }

    /// Exposed service.
    pub fn demo(&self) -> DemoService {
        DemoService::new()
    }
}
