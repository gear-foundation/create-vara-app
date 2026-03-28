use std::{env, path::PathBuf};

fn main() {
    sails_rs::build_wasm();

    // Generate IDL file alongside the build
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let idl_path = PathBuf::from(&manifest_dir).join("demo.idl");
    sails_rs::generate_idl_to_file::<demo_app::Program>(None, &idl_path).unwrap();
}
