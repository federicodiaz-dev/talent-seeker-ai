from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.runnables import Runnable

import os

def load_recruiting_agent() -> Runnable:
    prompt = ChatPromptTemplate.from_template("""
    You are a helpful recruiting assistant. Your will review and summarize the evaluations from other people. 
                                              
    Summary must look like this, choose one option per line:
    - Veredict: Continue / Reject
    - Coding skills: Excellent / Good / Fair / Poor
    - AI Knowledge: Excellent / Good / Fair / Poor
    - English level: A1 / A2 / B1 / B2 / C1 / C2
    - Work Experience: Excellent / Good / Fair / Poor
                                              
    Role: Jr / Semi Sr AI Engineer

    {english}
    {ai}
    {code}
    """)
        
    llm = ChatOpenAI(
            model="llama3.2-8192:latest",
            temperature=0.3,
            max_tokens=None,
            timeout=None,
            max_retries=2,
            base_url=os.environ.get("OPENAI_ENDPOINT"),
        )

    chain = prompt | llm
    return chain