import uuid
from typing import Literal
from dataclasses import dataclass, field


JobStatus = Literal["pending", "running", "done", "error"]


@dataclass
class Job:
    job_id: str
    status: JobStatus = "pending"
    result: dict = field(default_factory=dict)
    error: str = ""


_store: dict[str, Job] = {}


def create_job() -> str:
    jid = str(uuid.uuid4())
    _store[jid] = Job(job_id=jid)
    return jid


def get_job(job_id: str) -> Job | None:
    return _store.get(job_id)


def update_job(job_id: str, status: JobStatus, result: dict = None, error: str = ""):
    job = _store.get(job_id)
    if job:
        job.status = status
        if result is not None:
            job.result = result
        if error:
            job.error = error
