use std::sync::Arc;

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tokio::sync::{broadcast, mpsc, RwLock};
use tracing::{error, info, warn};

use veyonix_config::AgentConfig;
use veyonix_crypto::challenge::sign_hmac;
use veyonix_storage::{namespaces, StorageEngine};
use veyonix_network::ApiClient;
use veyonix_policy::{PolicyStore, PolicySyncer, PolicySyncOutcome};
use veyonix_enforcement::{EnforcementEngine, PolicyRule};
use veyonix_websocket::{run_with_reconnect, ReconnectPolicy, MsgType, WireMessage};
use veyonix_commands::dispatch;
use veyonix_heartbeat::sender::HeartbeatSender;
use veyonix_scheduler::registry::AgentScheduler;
use veyonix_telemetry::{TelemetryQueue, TelemetryFlusher, SystemCollector};

#[derive(Serialize, Deserialize, Clone)]
struct DeviceCredentials {
    device_id: String,
    device_secret: String,
    organization_id: String,
}

/// Orchestrates the entire lifecycle of the agent background loops.
pub struct AgentOrchestrator {
    config: AgentConfig,
    storage: Arc<StorageEngine>,
    engine: Arc<EnforcementEngine>,
    api_client: Arc<ApiClient>,
    policy_store: Arc<RwLock<PolicyStore>>,
}

impl AgentOrchestrator {
    pub fn new(
        config: AgentConfig,
        storage: Arc<StorageEngine>,
        engine: Arc<EnforcementEngine>,
    ) -> Result<Self> {
        let api_client = Arc::new(ApiClient::new(&config.server.base_url)?);
        let policy_store = Arc::new(RwLock::new(PolicyStore::new()));

        Ok(Self {
            config,
            storage,
            engine,
            api_client,
            policy_store,
        })
    }

    /// Run the enrollment, auth, initial sync, and spawn all background tasks.
    pub async fn run(self, mut shutdown_rx: broadcast::Receiver<()>) -> Result<()> {
        // 1. Enrollment & Authentication
        let creds = self.ensure_enrollment_and_auth().await?;
        info!(
            device_id = %creds.device_id,
            org_id = %creds.organization_id,
            "Agent authenticated successfully"
        );

        // 2. Policy Synchronization Setup
        let token_lock = Arc::new(RwLock::new(Some(self.get_cached_token().await.unwrap_or_default())));
        let mut policy_syncer = PolicySyncer::new(
            &creds.device_id,
            &self.config.server.base_url,
            token_lock.clone(),
        );

        // 3. Initial Policy Sync and Application
        info!("Performing initial policy synchronization...");
        self.sync_and_apply_policy(&creds.device_id, &mut policy_syncer).await?;

        // 4. WebSocket Client Connection Loop
        let ws_api_url = self.config.server.ws_url.clone();
        let ws_token = self.get_cached_token().await.unwrap_or_default();
        let (ws_tx, mut ws_rx) = mpsc::channel::<WireMessage>(100);

        tokio::spawn(async move {
            info!(ws_url = %ws_api_url, "Starting background WebSocket task...");
            run_with_reconnect(
                ws_api_url,
                ws_token,
                ws_tx,
                ReconnectPolicy::default(),
            )
            .await;
        });

        // 5. Spawn WebSocket Command Pump
        let device_id_clone = creds.device_id.clone();
        let store_clone = self.policy_store.clone();
        let engine_clone = self.engine.clone();
        let config_url_clone = self.config.server.base_url.clone();
        let token_lock_clone = token_lock.clone();

        tokio::spawn(async move {
            let mut syncer = PolicySyncer::new(
                &device_id_clone,
                &config_url_clone,
                token_lock_clone,
            );

            while let Some(msg) = ws_rx.recv().await {
                info!(msg_id = %msg.id, msg_type = ?msg.msg_type, "Received WebSocket message");

                match msg.msg_type {
                    MsgType::PolicyInvalidated => {
                        info!("Policy invalidation triggered via WebSocket");
                        let mut store_guard = store_clone.write().await;
                        match syncer.check_and_sync(&mut store_guard).await {
                            Ok(PolicySyncOutcome::Updated { new_hash }) => {
                                info!(hash = %new_hash, "Policy updated successfully via WebSocket invalidation");
                                if let Some(policy) = store_guard.current() {
                                    let rules = map_policy_to_rules(policy);
                                    engine_clone.apply_policy(&rules, &device_id_clone, policy.version).await;
                                }
                            }
                            Ok(PolicySyncOutcome::UpToDate) => {
                                info!("Policy already up to date");
                            }
                            Ok(PolicySyncOutcome::Error(e)) => {
                                error!(error = ?e, "Policy sync reported inner error");
                            }
                            Err(e) => {
                                error!(error = %e, "Failed to sync policy following invalidation");
                            }
                        }
                    }
                    MsgType::Command => {
                        if let Ok(cmd) = serde_json::from_value::<veyonix_commands::Command>(msg.payload) {
                            let result = dispatch(cmd).await;
                            // Optionally send acknowledgement/result back to the backend
                            info!(outcome = ?result, "Command execution outcome");
                        }
                    }
                    _ => {}
                }
            }
        });

        // 6. Setup Telemetry Queue & Flusher
        let telemetry_queue = Arc::new(TelemetryQueue::new(self.storage.clone()));
        let telemetry_flusher = TelemetryFlusher::new(telemetry_queue.clone(), self.api_client.clone());

        // 7. Setup Heartbeat Sender
        let heartbeat_sender = HeartbeatSender::new(self.api_client.clone(), creds.device_id.clone());

        // 8. Register and Start Cron Scheduler
        let scheduler = AgentScheduler::new().await.context("failed to init scheduler")?;

        // Heartbeat Job (every 30s)
        let heartbeat_sender_clone = heartbeat_sender.clone();
        let store_clone = self.policy_store.clone();
        scheduler.register_job("*/30 * * * * *", "heartbeat", move || {
            let sender = heartbeat_sender_clone.clone();
            let store = store_clone.clone();
            tokio::spawn(async move {
                let hash = {
                    let guard = store.read().await;
                    guard.current_hash().map(|h| h.to_string())
                };
                if let Err(e) = sender.send_ping("ONLINE", hash.as_deref()).await {
                    warn!(error = %e, "Heartbeat ping failed");
                }
            });
        }).await.context("failed to register heartbeat job")?;

        // Telemetry Collection Job (every 60s)
        let telemetry_queue_clone = telemetry_queue.clone();
        scheduler.register_job("0 * * * * *", "telemetry_collection", move || {
            let queue = telemetry_queue_clone.clone();
            let cpu_event = SystemCollector::collect_cpu();
            let mem_event = SystemCollector::collect_memory();
            if let Err(e) = queue.push(&cpu_event) {
                error!(error = %e, "Failed to queue CPU telemetry");
            }
            if let Err(e) = queue.push(&mem_event) {
                error!(error = %e, "Failed to queue memory telemetry");
            }
        }).await.context("failed to register telemetry collection job")?;

        // Telemetry Flush Job (every 5 minutes / 300s)
        // For development/MVP we can flush every 2 minutes ("0 */2 * * * *")
        let telemetry_flusher_clone = telemetry_flusher;
        scheduler.register_job("0 */2 * * * *", "telemetry_flush", move || {
            let flusher = telemetry_flusher_clone.clone();
            tokio::spawn(async move {
                if let Err(e) = flusher.flush().await {
                    error!(error = %e, "Telemetry flush failed");
                }
            });
        }).await.context("failed to register telemetry flush job")?;

        info!("Starting agent background scheduler...");
        scheduler.start().await.context("failed to start scheduler")?;

        // 9. Block until shutdown signal is received
        let _ = shutdown_rx.recv().await;
        info!("Orchestrator shutting down...");
        Ok(())
    }

    /// Retrieve existing credentials or perform enrollment + auth.
    async fn ensure_enrollment_and_auth(&self) -> Result<DeviceCredentials> {
        if let Some(creds) = self.storage.get_json::<DeviceCredentials>(namespaces::IDENTITY, "credentials")? {
            // Credentials exist; authenticate to get a fresh token.
            let token = self.authenticate(&creds).await?;
            self.api_client.set_token(token);
            Ok(creds)
        } else {
            // Credentials not found; enroll and authenticate.
            info!("Device credentials not found. Initiating enrollment...");
            let enroll_token = self.config.enrollment.token.as_ref().ok_or_else(|| {
                anyhow::anyhow!("Enrollment token missing from configuration")
            })?;

            let hostname = sysinfo::System::host_name()
                .or_else(|| std::env::var("COMPUTERNAME").ok())
                .or_else(|| std::env::var("HOSTNAME").ok())
                .unwrap_or_else(|| "unknown-host".to_string());
            let os = std::env::consts::OS.to_string();
            let arch = std::env::consts::ARCH.to_string();
            let agent_version = env!("CARGO_PKG_VERSION");

            let response = self.api_client.enroll(
                enroll_token,
                &hostname,
                &os,
                &arch,
                agent_version,
            ).await.context("enrollment request failed")?;

            let creds = DeviceCredentials {
                device_id: response.device_id,
                device_secret: response.device_secret,
                organization_id: response.organization_id,
            };

            self.storage.set_json(namespaces::IDENTITY, "credentials", &creds)?;
            info!(device_id = %creds.device_id, "Device enrolled and credentials saved");

            let token = self.authenticate(&creds).await?;
            self.api_client.set_token(token);
            Ok(creds)
        }
    }

    /// Authenticates via HMAC challenge response.
    async fn authenticate(&self, creds: &DeviceCredentials) -> Result<String> {
        info!(device_id = %creds.device_id, "Requesting auth challenge...");
        let challenge = self.api_client.auth_challenge(&creds.device_id)
            .await.context("auth challenge request failed")?.challenge;

        let signature = sign_hmac(creds.device_secret.as_bytes(), challenge.as_bytes())
            .context("failed to compute challenge signature")?;

        info!("Verifying challenge signature...");
        let response = self.api_client.auth_verify(&creds.device_id, &signature)
            .await.context("auth verification failed")?;

        // Cache the token locally in memory / storage
        self.storage.set(namespaces::IDENTITY, "token", response.token.as_bytes())?;
        Ok(response.token)
    }

    /// Get current cached token.
    async fn get_cached_token(&self) -> Option<String> {
        self.storage.get(namespaces::IDENTITY, "token")
            .ok()
            .flatten()
            .and_then(|bytes| String::from_utf8(bytes).ok())
    }

    /// Synchronize the policy and apply rules.
    async fn sync_and_apply_policy(&self, device_id: &str, syncer: &mut PolicySyncer) -> Result<()> {
        let mut store_guard = self.policy_store.write().await;
        match syncer.check_and_sync(&mut store_guard).await {
            Ok(PolicySyncOutcome::Updated { new_hash }) => {
                info!(hash = %new_hash, "New policy compiled");
                if let Some(policy) = store_guard.current() {
                    let rules = map_policy_to_rules(policy);
                    self.engine.apply_policy(&rules, device_id, policy.version).await;
                }
            }
            Ok(PolicySyncOutcome::UpToDate) => {
                info!("Policy is up-to-date");
                if let Some(policy) = store_guard.current() {
                    let rules = map_policy_to_rules(policy);
                    self.engine.apply_policy(&rules, device_id, policy.version).await;
                }
            }
            Ok(PolicySyncOutcome::Error(e)) => {
                warn!(error = ?e, "Policy sync reported inner error — using cached values if available");
                if let Some(policy) = store_guard.current() {
                    let rules = map_policy_to_rules(policy);
                    self.engine.apply_policy(&rules, device_id, policy.version).await;
                }
            }
            Err(e) => {
                warn!(error = %e, "Initial policy sync failed — using cached values if available");
                if let Some(policy) = store_guard.current() {
                    let rules = map_policy_to_rules(policy);
                    self.engine.apply_policy(&rules, device_id, policy.version).await;
                }
            }
        }
        Ok(())
    }
}

/// Helper to map EffectivePolicy.configuration key-values to Enforcement PolicyRules.
fn map_policy_to_rules(policy: &veyonix_policy::EffectivePolicy) -> Vec<PolicyRule> {
    let mut rules = Vec::new();
    if let Some(obj) = policy.configuration.as_object() {
        for (module_name, payload) in obj {
            rules.push(PolicyRule {
                id: format!("{}-rule", module_name),
                module: module_name.clone(),
                payload: payload.clone(),
                enabled: true,
            });
        }
    }
    rules
}
