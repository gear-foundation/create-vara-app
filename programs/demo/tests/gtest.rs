use demo_client::{demo::Demo, DemoClient, DemoClientCtors};
use sails_rs::{
    client::{GearEnv, GtestEnv},
    prelude::*,
};

const ADMIN_ID: u64 = 10;

type DemoActor = sails_rs::client::Actor<demo_client::DemoClientProgram, GtestEnv>;

async fn setup() -> DemoActor {
    let system = sails_rs::gtest::System::new();
    system.init_logger();
    system.mint_to(ADMIN_ID, 1_000_000_000_000_000);

    let env = GtestEnv::new(system, ADMIN_ID.into());

    let code_id = env
        .system()
        .submit_code_file("target/wasm32-gear/release/demo.opt.wasm");

    let deployment = env.deploy::<demo_client::DemoClientProgram>(code_id, b"salt".to_vec());
    deployment.new().await.unwrap()
}

// ---------------------------------------------------------------------------
// Happy Path Tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_increment() {
    let actor = setup().await;
    let mut demo = actor.demo();

    let result: u64 = demo.increment().await.unwrap();
    assert_eq!(result, 1);

    let result: u64 = demo.increment().await.unwrap();
    assert_eq!(result, 2);
}

#[tokio::test]
async fn test_send_message() {
    let actor = setup().await;
    let mut demo = actor.demo();

    let result: String = demo.send_message("Hello Vara!".to_string()).await.unwrap();
    assert!(result.contains("1"));
}

#[tokio::test]
async fn test_get_state() {
    let actor = setup().await;
    let mut demo = actor.demo();

    let _: u64 = demo.increment().await.unwrap();
    let _: String = demo.send_message("test".to_string()).await.unwrap();

    let state = demo.get_state().query().unwrap();
    assert_eq!(state.counter, 1);
    assert_eq!(state.message_count, 1);
    assert_eq!(state.ping_count, 0);
    assert!(state.last_caller.is_some());
}

#[tokio::test]
async fn test_get_counter() {
    let actor = setup().await;
    let mut demo = actor.demo();

    let _: u64 = demo.increment().await.unwrap();
    let _: u64 = demo.increment().await.unwrap();
    let _: u64 = demo.increment().await.unwrap();

    let counter = demo.get_counter().query().unwrap();
    assert_eq!(counter, 3);
}

#[tokio::test]
async fn test_get_messages() {
    let actor = setup().await;
    let mut demo = actor.demo();

    let _: String = demo.send_message("msg1".to_string()).await.unwrap();
    let _: String = demo.send_message("msg2".to_string()).await.unwrap();

    let messages = demo.get_messages().query().unwrap();
    assert_eq!(messages.len(), 2);
    assert_eq!(messages[0].text, "msg1");
    assert_eq!(messages[1].text, "msg2");
}

// ---------------------------------------------------------------------------
// Negative Tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_send_empty_message_fails() {
    let actor = setup().await;
    let mut demo = actor.demo();

    let result: Result<String, _> = demo.send_message("".to_string()).await;
    assert!(result.is_err(), "Empty message should fail");
}

#[tokio::test]
async fn test_send_long_message_fails() {
    let actor = setup().await;
    let mut demo = actor.demo();

    let long_msg = "x".repeat(300);
    let result: Result<String, _> = demo.send_message(long_msg).await;
    assert!(result.is_err(), "Message over 256 chars should fail");
}

#[tokio::test]
async fn test_handle_ping_from_external_fails() {
    let actor = setup().await;
    let mut demo = actor.demo();

    let result: Result<(), _> = demo.handle_ping().await;
    assert!(result.is_err(), "External handle_ping should fail");
}

// ---------------------------------------------------------------------------
// Capacity Test
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_messages_ring_buffer() {
    let actor = setup().await;
    let mut demo = actor.demo();

    for i in 0..110 {
        let _: String = demo.send_message(format!("msg_{}", i)).await.unwrap();
    }

    let messages = demo.get_messages().query().unwrap();
    assert_eq!(messages.len(), 100);
    assert_eq!(messages[0].text, "msg_10");
    assert_eq!(messages[99].text, "msg_109");
}

// ---------------------------------------------------------------------------
// Sequencing Test
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_sequencing() {
    let actor = setup().await;
    let mut demo = actor.demo();

    let _: u64 = demo.increment().await.unwrap();
    let _: String = demo.send_message("hello".to_string()).await.unwrap();
    let _: u64 = demo.increment().await.unwrap();

    let counter = demo.get_counter().query().unwrap();
    assert_eq!(counter, 2);

    let messages = demo.get_messages().query().unwrap();
    assert_eq!(messages.len(), 1);
}
