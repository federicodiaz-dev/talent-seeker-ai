from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.runnables import Runnable

import os

def load_ai_engineer_agent() -> Runnable:
    prompt = ChatPromptTemplate.from_template("""
    You are an AI Engineering expert. Evaluate the following interview candidate for:
    - AI Knowledge 
    - AI Engineering Skills
    - AI Frameworks
    - Problem Solving Skills
    
    Do not provide any other information or feedback regarding the questions.
    Provide a single score for the candidate. Score must be between 1 and 10, where 1 is the lowest and 10 is the highest.
    Provide a short justification for the score. Justification must be between 1 and 3 sentences.
    
    Interview:
    {interview}
    """)
        
    llm = ChatOpenAI(
            model="llama3.2-4096:latest",
            temperature=0.3,
            max_tokens=None,
            timeout=None,
            max_retries=2,
            base_url=os.environ.get("OPENAI_ENDPOINT"),
        )

    chain = prompt | llm
    return chain