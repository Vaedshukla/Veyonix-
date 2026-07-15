#[cfg(windows)]
use anyhow::Result;

#[cfg(windows)]
pub fn run_as_service(_args: crate::RunArgs) -> Result<()> {
    use std::ffi::OsString;
    use windows_service::{
        define_windows_service,
        service::{
            ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
            ServiceType,
        },
        service_control_handler::{self, ServiceControlHandlerResult},
        service_dispatcher,
    };
    use std::time::Duration;
    use tracing::{error, info};
    use veyonix_core::AgentContext;

    const SERVICE_NAME: &str = "VeyonixAgent";

    define_windows_service!(ffi_service_main, my_service_main);

    pub fn my_service_main(arguments: Vec<OsString>) {
        if let Err(e) = run_service(arguments) {
            error!("Service failed: {:?}", e);
        }
    }

    pub fn run_service(_arguments: Vec<OsString>) -> Result<()> {
        let (shutdown_tx, mut shutdown_rx) = tokio::sync::mpsc::channel(1);

        let event_handler = move |control_event| -> ServiceControlHandlerResult {
            match control_event {
                ServiceControl::Stop => {
                    let _ = shutdown_tx.blocking_send(());
                    ServiceControlHandlerResult::NoError
                }
                ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
                _ => ServiceControlHandlerResult::NotImplemented,
            }
        };

        let status_handle = service_control_handler::register(SERVICE_NAME, event_handler)?;

        let set_status = |state, accepts| {
            status_handle
                .set_service_status(ServiceStatus {
                    service_type: ServiceType::OWN_PROCESS,
                    current_state: state,
                    controls_accepted: accepts,
                    exit_code: ServiceExitCode::Win32(0),
                    checkpoint: 0,
                    wait_hint: Duration::default(),
                    process_id: None,
                })
                .map_err(|e| anyhow::anyhow!("Failed to set service status: {:?}", e))
        };

        set_status(ServiceState::Running, ServiceControlAccept::STOP)?;

        // Spin up the async runtime
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async {
            // Re-parse or pass down the config here
            // In a real scenario, we load config from default location
            let cfg = veyonix_config::load(None).expect("Failed to load config");
            
            // Set up log (we might need a dedicated log setup for service, 
            // but we'll use the default for now)
            
            let ctx = AgentContext::new(cfg);
            
            tokio::select! {
                _ = shutdown_rx.recv() => {
                    info!("Service stop requested, shutting down context");
                    ctx.shutdown();
                }
                res = ctx.run() => {
                    if let Err(e) = res {
                        error!("Agent runloop exited with error: {:?}", e);
                    }
                }
            }
        });

        set_status(ServiceState::Stopped, ServiceControlAccept::empty())?;

        Ok(())
    }

    service_dispatcher::start(SERVICE_NAME, ffi_service_main)?;
    Ok(())
}

#[cfg(not(windows))]
pub fn run_as_service(_args: crate::RunArgs) -> anyhow::Result<()> {
    anyhow::bail!("Windows Services are only supported on Windows.");
}
