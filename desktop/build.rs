fn main() {
    println!("cargo:rerun-if-changed=../frontend/dist");
    tauri_build::build()
}
