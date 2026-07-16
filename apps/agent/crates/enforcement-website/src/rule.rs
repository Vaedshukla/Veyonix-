//! Policy rule deserialization for the `website_filter` module.

use serde::{Deserialize, Serialize};

/// A single website-filter rule as delivered by the policy engine.
///
/// The backend should serialize rules with this shape inside
/// `PolicyRule.payload` for `module == "website_filter"`.
///
/// ```json
/// {
///   "domains": ["youtube.com", "reddit.com", "tiktok.com"],
///   "also_block_www": true
/// }
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebsiteFilterRule {
    /// Domains to block (bare, without scheme or `www.` prefix).
    pub domains: Vec<String>,
    /// If true, also add `www.<domain>` entries.  Defaults to `true`.
    #[serde(default = "default_true")]
    pub also_block_www: bool,
}

fn default_true() -> bool {
    true
}
