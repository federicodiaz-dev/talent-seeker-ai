from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.runnables import Runnable

import os

#### TODO: Improve agent output, it needs to evaluate only english, 
# show strenghts and what's missing for the next level"""
def load_english_agent() -> Runnable:
    prompt = ChatPromptTemplate.from_template(
    """
    You are an English language evaluator reviewing a candidate's answer from a technical interview. Your task is to assess only the English usage, not the technical content. Focus on grammar, fluency, vocabulary, and clarity of expression.

    Ignore any technical correctness or subject-matter accuracy.

    Based on the candidate's use of English, assign a CEFR level (from A1 to C2), and provide detailed feedback.

    For the review, include:
    1.CEFR Rating (A1, A2, B1, B2, C1, C2)
    2.Reasoning for the rating, referencing grammar, vocabulary, fluency, and clarity
    3.Suggestions for improvement (if any)

    Interview:
    {interview}
    """)

    llm = ChatOpenAI(
            model="llama3.2-8192:latest",
            temperature=0.2,
            max_tokens=None,
            timeout=None,
            max_retries=2,
            base_url=os.environ.get("OPENAI_ENDPOINT"),
        )

    chain = prompt | llm
    return chain