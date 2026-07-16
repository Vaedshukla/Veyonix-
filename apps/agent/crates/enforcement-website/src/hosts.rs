//! Hosts-file manipulation utilities.
//!
//! Handles atomic read-modify-write of the OS hosts file, isolating the
//! managed Veyonix block from user-owned entries.

use std::path::{Path, PathBuf};

use tracing::{debug, warn};

use veyonix_enforcement::EnforcementError;

/// Delimiter lines wrapping the Veyonix-managed hosts block.
const MANAGED_BEGIN: &str = "# --- VEYONIX-MANAGED BEGIN ---";
const MANAGED_END: &str = "# --- VEYONIX-MANAGED END ---";

/// Return the platform-specific path to the OS hosts file.
pub fn hosts_path() -> PathBuf {
    #[cfg(windows)]
    {
        let windir = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into());
        PathBuf::from(format!(
            "{}\\System32\\drivers\\etc\\hosts",
            windir
        ))
    }
    #[cfg(not(windows))]
    {
        PathBuf::from("/etc/hosts")
    }
}

/// Read the hosts file and return its content split into:
/// - `before`: lines before the managed block (or the entire file if no block)
/// - `after`:  lines after the managed block
pub fn read_unmanaged(path: &Path) -> Result<(Vec<String>, Vec<String>), EnforcementError> {
    let content = std::fs::read_to_string(path).map_err(EnforcementError::Io)?;
    split_unmanaged(&content)
}

fn split_unmanaged(content: &str) -> Result<(Vec<String>, Vec<String>), EnforcementError> {
    let lines: Vec<&str> = content.lines().collect();

    let begin_pos = lines.iter().position(|l| l.trim() == MANAGED_BEGIN);
    let end_pos = lines.iter().position(|l| l.trim() == MANAGED_END);

    match (begin_pos, end_pos) {
        (None, None) => {
            // No managed block yet — the whole file is "before"
            let before = lines.iter().map(|l| l.to_string()).collect();
            Ok((before, vec![]))
        }
        (Some(b), Some(e)) if b < e => {
            let before = lines[..b].iter().map(|l| l.to_string()).collect();
            let after = lines[e + 1..].iter().map(|l| l.to_string()).collect();
            Ok((before, after))
        }
        _ => {
            // Malformed (only one delimiter present) — log a warning and treat
            // the entire file as pre-existing content, discarding the stale marker.
            warn!("hosts file has malformed Veyonix delimiters — treating as unmanaged");
            let before = lines
                .iter()
                .filter(|l| l.trim() != MANAGED_BEGIN && l.trim() != MANAGED_END)
                .map(|l| l.to_string())
                .collect();
            Ok((before, vec![]))
        }
    }
}

/// Atomically write the hosts file with the new managed block.
///
/// Writes to a temp file in the same directory and then renames it over the
/// original, so a crash mid-write can never corrupt the hosts file.
pub fn write_with_block(
    path: &Path,
    before: &[String],
    managed_entries: &[String],
    after: &[String],
) -> Result<(), EnforcementError> {
    let mut lines: Vec<String> = Vec::new();

    // Preserve existing entries
    lines.extend_from_slice(before);

    // Ensure we don't leave a trailing blank line before the block
    if !lines.is_empty() && !lines.last().map_or(true, |l: &String| l.is_empty()) {
        lines.push(String::new());
    }

    if !managed_entries.is_empty() {
        lines.push(MANAGED_BEGIN.to_string());
        lines.extend_from_slice(managed_entries);
        lines.push(MANAGED_END.to_string());
        lines.push(String::new()); // trailing newline after block
    }

    lines.extend_from_slice(after);

    let content = lines.join("\n");

    // Write to a temp file then atomically rename
    let tmp_path = path.with_extension("hosts.veyonix.tmp");
    std::fs::write(&tmp_path, &content).map_err(EnforcementError::Io)?;
    std::fs::rename(&tmp_path, path).map_err(|e| {
        // Clean up the temp file if rename fails
        let _ = std::fs::remove_file(&tmp_path);
        EnforcementError::Io(e)
    })?;

    debug!(path = %path.display(), entries = managed_entries.len(), "hosts file updated");
    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_NO_BLOCK: &str = "127.0.0.1 localhost\n::1 localhost";

    const SAMPLE_WITH_BLOCK: &str = "127.0.0.1 localhost\n\
        # --- VEYONIX-MANAGED BEGIN ---\n\
        0.0.0.0 youtube.com\n\
        0.0.0.0 www.youtube.com\n\
        # --- VEYONIX-MANAGED END ---\n\
        ::1 localhost";

    #[test]
    fn split_no_block() {
        let (before, after) = split_unmanaged(SAMPLE_NO_BLOCK).unwrap();
        assert_eq!(before, vec!["127.0.0.1 localhost", "::1 localhost"]);
        assert!(after.is_empty());
    }

    #[test]
    fn split_with_block() {
        let (before, after) = split_unmanaged(SAMPLE_WITH_BLOCK).unwrap();
        assert_eq!(before, vec!["127.0.0.1 localhost"]);
        assert_eq!(after, vec!["::1 localhost"]);
    }

    #[test]
    fn roundtrip_empty_managed() {
        let before = vec!["127.0.0.1 localhost".to_string()];
        let after = vec!["::1 localhost".to_string()];
        let managed: Vec<String> = vec![];

        // Write without block (empty managed)
        let tmp = std::env::temp_dir().join("veyonix_test_hosts");
        std::fs::write(&tmp, "127.0.0.1 localhost\n::1 localhost").unwrap();
        write_with_block(&tmp, &before, &managed, &after).unwrap();

        // No managed block should appear in the file
        let full = std::fs::read_to_string(&tmp).unwrap();
        assert!(!full.contains(MANAGED_BEGIN), "no managed block expected");
        assert!(full.contains("127.0.0.1 localhost"), "before content preserved");
        assert!(full.contains("::1 localhost"), "after content preserved");

        // When there's no delimiter, read_unmanaged returns everything in `before`
        let (b2, a2) = read_unmanaged(&tmp).unwrap();
        assert!(b2.iter().any(|l| l.contains("127.0.0.1")));
        assert!(b2.iter().any(|l| l.contains("::1")));
        assert!(a2.is_empty(), "no `after` section when no delimiter block");

        let _ = std::fs::remove_file(&tmp);
    }

    #[test]
    fn roundtrip_with_managed() {
        let before = vec!["127.0.0.1 localhost".to_string()];
        let after = vec![];
        let managed = vec!["0.0.0.0 reddit.com".to_string()];

        let tmp = std::env::temp_dir().join("veyonix_test_hosts2");
        std::fs::write(&tmp, "127.0.0.1 localhost").unwrap();
        write_with_block(&tmp, &before, &managed, &after).unwrap();

        let full = std::fs::read_to_string(&tmp).unwrap();
        assert!(full.contains(MANAGED_BEGIN));
        assert!(full.contains("0.0.0.0 reddit.com"));
        assert!(full.contains(MANAGED_END));
        let _ = std::fs::remove_file(&tmp);
    }
}
