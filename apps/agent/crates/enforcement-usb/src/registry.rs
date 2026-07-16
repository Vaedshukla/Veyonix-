//! Windows Registry helpers for the `USBSTOR` service key.
//!
//! The `Start` DWORD value controls when Windows loads the USB mass-storage driver:
//!
//! | Start | Boot type | Description                        |
//! |-------|-----------|------------------------------------|
//! | 0     | Boot      | Loaded by the OS loader            |
//! | 1     | System    | Loaded during kernel initialisation|
//! | 2     | Automatic | Loaded at system startup           |
//! | 3     | Manual    | Loaded on demand (default)         |
//! | 4     | Disabled  | Never loaded                       |
//!
//! We toggle between **3** (allow) and **4** (block).

use veyonix_enforcement::EnforcementError;

/// Registry path for the USBSTOR service.
pub const USBSTOR_KEY: &str = r"SYSTEM\CurrentControlSet\Services\USBSTOR";

/// `Start` value name inside the USBSTOR key.
pub const START_VALUE: &str = "Start";

/// Manual-start constant (USB allowed).
pub const START_MANUAL: u32 = 3;

/// Disabled constant (USB blocked).
pub const START_DISABLED: u32 = 4;

// ---------------------------------------------------------------------------
// Platform-specific implementations
// ---------------------------------------------------------------------------

/// Read the current `Start` value from the USBSTOR service key.
#[cfg(windows)]
pub fn read_usbstor_start() -> Result<u32, EnforcementError> {
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = hklm.open_subkey(USBSTOR_KEY).map_err(|e| {
        EnforcementError::ModuleFailed {
            module: "usb_block",
            reason: format!("failed to open USBSTOR registry key: {}", e),
        }
    })?;

    let start: u32 = key.get_value(START_VALUE).map_err(|e| {
        EnforcementError::ModuleFailed {
            module: "usb_block",
            reason: format!("failed to read USBSTOR Start value: {}", e),
        }
    })?;

    Ok(start)
}

/// Write a new `Start` value to the USBSTOR service key.
///
/// Requires Administrator / LocalSystem privileges.
#[cfg(windows)]
pub fn write_usbstor_start(value: u32) -> Result<(), EnforcementError> {
    use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_WRITE};
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = hklm
        .open_subkey_with_flags(USBSTOR_KEY, KEY_WRITE)
        .map_err(|e| EnforcementError::PermissionDenied(format!(
            "cannot open USBSTOR key for writing (run as Administrator): {}",
            e
        )))?;

    key.set_value(START_VALUE, &value).map_err(|e| {
        EnforcementError::ModuleFailed {
            module: "usb_block",
            reason: format!("failed to write USBSTOR Start = {}: {}", value, e),
        }
    })?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Non-Windows stubs (compile-time only; never called at runtime)
// ---------------------------------------------------------------------------

#[cfg(not(windows))]
pub fn read_usbstor_start() -> Result<u32, EnforcementError> {
    // On non-Windows platforms, always report "manual" (allowed).
    Ok(START_MANUAL)
}

#[cfg(not(windows))]
pub fn write_usbstor_start(value: u32) -> Result<(), EnforcementError> {
    tracing::debug!(
        value,
        "usb_block: write_usbstor_start called on non-Windows (stub — no-op)"
    );
    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    /// On non-Windows CI / dev machines the stub must return without error.
    #[cfg(not(windows))]
    #[test]
    fn stub_read_returns_manual() {
        let v = read_usbstor_start().expect("stub read should succeed");
        assert_eq!(v, START_MANUAL);
    }

    #[cfg(not(windows))]
    #[test]
    fn stub_write_is_noop() {
        // No error, no side-effects on non-Windows.
        write_usbstor_start(START_DISABLED).expect("stub write should succeed");
    }

    /// Constants sanity-check — these values are defined by the Windows SCM
    /// spec and must never change.
    #[test]
    fn constants_are_correct() {
        assert_eq!(START_MANUAL, 3, "manual start must be 3");
        assert_eq!(START_DISABLED, 4, "disabled must be 4");
    }
}
