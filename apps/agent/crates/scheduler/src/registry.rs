use std::sync::Arc;
use thiserror::Error;
use tokio_cron_scheduler::{Job, JobScheduler, JobSchedulerError};
use tracing::info;

#[derive(Debug, Error)]
pub enum SchedulerError {
    #[error("Job scheduler error: {0}")]
    Scheduler(#[from] JobSchedulerError),
}

pub struct AgentScheduler {
    sched: JobScheduler,
}

impl AgentScheduler {
    pub async fn new() -> Result<Self, SchedulerError> {
        let sched = JobScheduler::new().await?;
        Ok(Self { sched })
    }

    pub async fn register_job<F>(
        &self,
        cron_expr: &str,
        name: &str,
        action: F,
    ) -> Result<(), SchedulerError>
    where
        F: Fn() + Send + Sync + 'static,
    {
        let name_owned = name.to_string();
        let action_arc = Arc::new(action);
        
        let job = Job::new_async(cron_expr, move |_uuid, _l| {
            let action_clone = action_arc.clone();
            Box::pin(async move {
                action_clone();
            })
        })?;

        self.sched.add(job).await?;
        info!("Registered cron job: {} ({})", name_owned, cron_expr);

        Ok(())
    }

    pub async fn start(&self) -> Result<(), SchedulerError> {
        self.sched.start().await?;
        Ok(())
    }
}
