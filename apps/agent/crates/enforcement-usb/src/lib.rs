//! `veyonix-enforcement-usb` — USB mass storage blocking via Windows Registry.
//!
//! # How it works
//!
//! The Windows `USBSTOR` driver controls all USB mass storage devices
//! (flash drives, external hard drives, etc.).  Its startup type is stored at:
//!
//! ```text
//! HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\USBSTOR
//!     Start = DWORD
//! ```
//!
//! | Value | Meaning               |
//! |-------|-----------------------|
//! | `3`   | Manual (USB allowed)  |
//! | `4`   | Disabled (USB blocked)|
//!
//! By setting `Start = 4`, the OS stops accepting any new USB mass storage
//! devices.  Existing mounted drives remain until unplugged.
//!
//! On `rollback()` the value is restored to `3`.
//!
//! # Privileges
//!
//! Writing to `HKLM\...\Services\USBSTOR` requires **Administrator** or
//! **LocalSystem** privileges.  The agent must be running as a Windows Service
//! with at least Administrator rights.

pub mod enforcer;
pub mod registry;
pub mod rule;

pub use enforcer::UsbBlockEnforcer;
