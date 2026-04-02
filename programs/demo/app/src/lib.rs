#![no_std]
#![allow(static_mut_refs)]

use sails_rs::{
    gstd::{exec, msg},
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
    pub greeting: String,
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

#[derive(Clone, Debug, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct StoredMessage {
    pub sender: ActorId,
    pub text: String,
    pub block_height: u32,
}

#[derive(Clone, Debug, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct StateView {
    pub counter: u64,
    pub last_caller: Option<ActorId>,
    pub ping_count: u64,
    pub message_count: u32,
    pub greeting: String,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
#[derive(Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
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
    GreetingSet {
        greeting: String,
        caller: ActorId,
    },
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct DemoService(());

impl DemoService {
    pub fn create() -> Self {
        Self(())
    }
}

#[sails_rs::service(events = DemoEvents)]
impl DemoService {
    // -- Commands --

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

    /// Set the program greeting. Anyone can change it.
    #[export]
    pub fn set_greeting(&mut self, greeting: String) -> String {
        if greeting.is_empty() {
            panic!("Greeting cannot be empty");
        }
        if greeting.len() > 128 {
            panic!("Greeting exceeds 128 character limit");
        }
        let s = state_mut();
        s.greeting = greeting.clone();
        let caller = msg::source();
        s.last_caller = Some(caller);
        self.emit_event(DemoEvents::GreetingSet { greeting: greeting.clone(), caller })
            .expect("Failed to emit event");
        greeting
    }

    // -- Queries --

    /// Get a summary of the current state.
    #[export]
    pub fn get_state(&self) -> StateView {
        let s = state();
        StateView {
            counter: s.counter,
            last_caller: s.last_caller,
            ping_count: s.ping_count,
            message_count: s.messages.len() as u32,
            greeting: s.greeting.clone(),
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

    /// Get the current greeting.
    #[export]
    pub fn get_greeting(&self) -> String {
        state().greeting.clone()
    }
}

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

#[derive(Default)]
pub struct Program(());

#[sails_rs::program]
impl Program {
    /// Constructor: initializes program state.
    pub fn create() -> Self {
        seed();
        Self(())
    }

    /// Exposed service.
    pub fn demo(&self) -> DemoService {
        DemoService::create()
    }
}
