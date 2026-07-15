use crate::models::{EffectivePolicy, StoredVersion};
use sha2::{Digest, Sha256};
use serde_json::{Map, Value};

/// Recursively deep-merges two JSON objects.
///
/// Fields from `overlay` override fields in `base`. When both sides have an
/// Object value for the same key the merge recurses; for any other type the
/// overlay value wins outright.
fn deep_merge(base: &mut Map<String, Value>, overlay: &Map<String, Value>) {
    for (key, overlay_val) in overlay {
        match base.get_mut(key) {
            Some(base_val) if base_val.is_object() && overlay_val.is_object() => {
                // Both are objects – recurse.
                let base_obj = base_val.as_object_mut().unwrap();
                let overlay_obj = overlay_val.as_object().unwrap();
                deep_merge(base_obj, overlay_obj);
            }
            _ => {
                // Scalar / array / type mismatch – overlay wins.
                base.insert(key.clone(), overlay_val.clone());
            }
        }
    }
}

/// Serialises a [`serde_json::Value`] with sorted object keys so that the
/// SHA-256 digest is deterministic regardless of insertion order.
fn serialize_sorted(value: &Value) -> String {
    match value {
        Value::Object(map) => {
            let mut sorted: Vec<(&String, &Value)> = map.iter().collect();
            sorted.sort_by_key(|(k, _)| *k);
            let pairs: Vec<String> = sorted
                .iter()
                .map(|(k, v)| format!("{}:{}", serde_json::to_string(k).unwrap(), serialize_sorted(v)))
                .collect();
            format!("{{{}}}", pairs.join(","))
        }
        Value::Array(arr) => {
            let items: Vec<String> = arr.iter().map(serialize_sorted).collect();
            format!("[{}]", items.join(","))
        }
        other => serde_json::to_string(other).unwrap(),
    }
}

/// Compiles an ordered slice of policy layers into a single [`EffectivePolicy`].
///
/// Layers are applied left-to-right (Global → Device), so later entries
/// override earlier ones.  The `version` of the compiled policy is taken from
/// the highest version number across all layers.  The `hash` is the SHA-256
/// hex digest of the deterministically serialised merged configuration.
pub fn compile(versions: &[StoredVersion]) -> EffectivePolicy {
    let mut merged: Map<String, Value> = Map::new();
    let mut max_version: u64 = 0;

    for layer in versions {
        max_version = max_version.max(layer.version);

        if let Some(obj) = layer.configuration.as_object() {
            deep_merge(&mut merged, obj);
        }
    }

    let merged_value = Value::Object(merged);
    let canonical = serialize_sorted(&merged_value);
    let digest = Sha256::digest(canonical.as_bytes());
    let hash = hex::encode(digest);

    EffectivePolicy {
        version: max_version,
        hash,
        configuration: merged_value,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn make_version(version: u64, config: Value) -> StoredVersion {
        StoredVersion {
            version,
            configuration: config,
            stored_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn compile_single_layer() {
        let layers = vec![make_version(1, json!({ "timeout": 30, "retries": 3 }))];
        let policy = compile(&layers);
        assert_eq!(policy.version, 1);
        assert_eq!(policy.configuration["timeout"], 30);
        assert_eq!(policy.configuration["retries"], 3);
        assert!(!policy.hash.is_empty());
    }

    #[test]
    fn later_layer_overrides_earlier() {
        let layers = vec![
            make_version(1, json!({ "timeout": 30, "retries": 3 })),
            make_version(2, json!({ "timeout": 60 })),
        ];
        let policy = compile(&layers);
        assert_eq!(policy.version, 2);
        assert_eq!(policy.configuration["timeout"], 60);
        // Field not in overlay retains base value.
        assert_eq!(policy.configuration["retries"], 3);
    }

    #[test]
    fn deep_merge_nested_objects() {
        let layers = vec![
            make_version(1, json!({ "network": { "proxy": "none", "timeout": 10 } })),
            make_version(2, json!({ "network": { "timeout": 30, "tls": true } })),
        ];
        let policy = compile(&layers);
        let network = &policy.configuration["network"];
        assert_eq!(network["proxy"], "none");
        assert_eq!(network["timeout"], 30);
        assert_eq!(network["tls"], true);
    }

    #[test]
    fn scalar_overlay_wins_over_object() {
        // If overlay turns a nested object into a scalar the overlay wins.
        let layers = vec![
            make_version(1, json!({ "setting": { "a": 1 } })),
            make_version(2, json!({ "setting": "flat" })),
        ];
        let policy = compile(&layers);
        assert_eq!(policy.configuration["setting"], "flat");
    }

    #[test]
    fn empty_layers_produces_empty_policy() {
        let policy = compile(&[]);
        assert_eq!(policy.version, 0);
        assert!(policy.configuration.as_object().unwrap().is_empty());
        // Hash of "{}" (empty sorted object).
        let expected = hex::encode(Sha256::digest("{}".as_bytes()));
        assert_eq!(policy.hash, expected);
    }

    #[test]
    fn hash_is_deterministic() {
        let layers = vec![make_version(1, json!({ "b": 2, "a": 1 }))];
        let p1 = compile(&layers);
        let p2 = compile(&layers);
        assert_eq!(p1.hash, p2.hash);
    }

    #[test]
    fn hash_changes_with_different_config() {
        let p1 = compile(&[make_version(1, json!({ "a": 1 }))]);
        let p2 = compile(&[make_version(1, json!({ "a": 2 }))]);
        assert_ne!(p1.hash, p2.hash);
    }

    #[test]
    fn version_is_max_across_layers() {
        let layers = vec![
            make_version(5, json!({})),
            make_version(1, json!({})),
            make_version(3, json!({})),
        ];
        let policy = compile(&layers);
        assert_eq!(policy.version, 5);
    }
}
