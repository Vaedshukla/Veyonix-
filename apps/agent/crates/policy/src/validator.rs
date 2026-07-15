use crate::error::PolicyError;
use serde_json::Value;

/// Validates that a raw policy payload is structurally well-formed before
/// it is stored or compiled.
///
/// # Rules
/// * The payload must be a JSON Object.
/// * It must contain a `"version"` key whose value is a non-negative integer (`u64`).
/// * It must contain a `"configuration"` key whose value is a JSON Object.
///
/// # Errors
/// Returns [`PolicyError::InvalidSchema`] with a human-readable message if any
/// rule is violated.
pub fn validate(payload: &Value) -> Result<(), PolicyError> {
    // 1. Top-level must be an object.
    let obj = payload.as_object().ok_or_else(|| {
        PolicyError::InvalidSchema(
            "payload must be a JSON object at the top level".to_string(),
        )
    })?;

    // 2. Must contain a `version` key that is a valid u64.
    let version_val = obj.get("version").ok_or_else(|| {
        PolicyError::InvalidSchema("missing required field: \"version\"".to_string())
    })?;

    version_val.as_u64().ok_or_else(|| {
        PolicyError::InvalidSchema(format!(
            "field \"version\" must be a non-negative integer, got: {}",
            version_val
        ))
    })?;

    // 3. Must contain a `configuration` key that is an object.
    let config_val = obj.get("configuration").ok_or_else(|| {
        PolicyError::InvalidSchema("missing required field: \"configuration\"".to_string())
    })?;

    if !config_val.is_object() {
        return Err(PolicyError::InvalidSchema(format!(
            "field \"configuration\" must be a JSON object, got: {}",
            config_val
        )));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn valid_payload_passes() {
        let payload = json!({
            "version": 1,
            "configuration": { "key": "value" }
        });
        assert!(validate(&payload).is_ok());
    }

    #[test]
    fn rejects_non_object_root() {
        let payload = json!([1, 2, 3]);
        let err = validate(&payload).unwrap_err();
        assert!(matches!(err, PolicyError::InvalidSchema(_)));
    }

    #[test]
    fn rejects_missing_version() {
        let payload = json!({ "configuration": {} });
        let err = validate(&payload).unwrap_err();
        assert!(matches!(err, PolicyError::InvalidSchema(_)));
    }

    #[test]
    fn rejects_non_integer_version() {
        let payload = json!({ "version": "one", "configuration": {} });
        let err = validate(&payload).unwrap_err();
        assert!(matches!(err, PolicyError::InvalidSchema(_)));
    }

    #[test]
    fn rejects_negative_version() {
        // JSON negative numbers deserialize as i64, not u64.
        let payload = json!({ "version": -1, "configuration": {} });
        let err = validate(&payload).unwrap_err();
        assert!(matches!(err, PolicyError::InvalidSchema(_)));
    }

    #[test]
    fn rejects_missing_configuration() {
        let payload = json!({ "version": 1 });
        let err = validate(&payload).unwrap_err();
        assert!(matches!(err, PolicyError::InvalidSchema(_)));
    }

    #[test]
    fn rejects_non_object_configuration() {
        let payload = json!({ "version": 1, "configuration": "string" });
        let err = validate(&payload).unwrap_err();
        assert!(matches!(err, PolicyError::InvalidSchema(_)));
    }
}
