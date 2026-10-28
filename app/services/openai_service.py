from langchain_openai import ChatOpenAI
from langchain_community.callbacks import get_openai_callback
import os
import logging

class OpenAIService:
    def __init__(self):
        self.endpoint = os.environ.get("OPENAI_ENDPOINT")
        self.api_key = os.environ.get("OPENAI_API_KEY")
        self.llm = ChatOpenAI(
            model="llama3.2-4096:latest",
            temperature=0.3,
            max_tokens=None,
            timeout=None,
            max_retries=2,
            base_url=self.endpoint,
        )

    def evaluate_interview(self, transcript: str) -> str:
        messages = [
            (
                "system",
                """Context: You're an expert in evaluating job interviews. The following is a job interview transcript.
                Please provide a detailed evaluation of the interviewee's performance, including strengths and weaknesses.
                Give a rating from 1 to 10, where 1 is the worst and 10 is the best.
                This open position is for a junior or semi-senior AI Engineer"""
            ),
            ("human", transcript),
        ]

        print(messages)
        with get_openai_callback() as cb:
            ai_msg = self.llm.invoke(messages)
        print("---")
        print()

        print(f"Total Tokens: {cb.total_tokens}")
        print(f"Prompt Tokens: {cb.prompt_tokens}")
        print(f"Completion Tokens: {cb.completion_tokens}")
        print(f"Total Cost (USD): ${cb.total_cost}")
        return ai_msg.content.strip()