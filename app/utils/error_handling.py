import logging
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type, RetryError

# Custom exception classes for clarity
class SharePointError(Exception): pass
class InfraError(Exception): pass
class LLMError(Exception): pass
class StorageError(Exception): pass

def log_and_raise(retry_state):
    last_exc = retry_state.outcome.exception()
    logging.error(f"Operation failed after {retry_state.attempt_number} attempts: {last_exc}")
    raise last_exc

def global_retry():
    return retry(
        stop=stop_after_attempt(3),
        wait=wait_fixed(1),  # 1 second between retries
        retry_error_callback=log_and_raise,
        reraise=True
    )
