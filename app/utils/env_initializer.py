import os


def init_env_variables():
    openai_endpoint = os.environ.get("OPENAI_ENDPOINT")
    openai_api_key = os.environ.get("OPENAI_API_KEY")

    if not openai_endpoint or not openai_api_key:
        raise ValueError("Environment variables for OpenAI are not set properly.")

    return openai_endpoint, openai_api_key