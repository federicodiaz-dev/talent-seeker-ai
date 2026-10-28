from datetime import datetime
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage
from langchain_community.callbacks import get_openai_callback
from langchain_core.runnables import Runnable
from langgraph.graph import StateGraph, END, START, MessagesState
from langgraph.graph.message import add_messages
from langgraph.types import Command
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from typing import TypedDict, Annotated, Literal
import json
import os
import re

# base_url = "http://100.101.222.107:11434/v1/"
# openai_api_key = "ollama"

base_url = "https://api.groq.com/openai/v1"
openai_api_key = ""
model = "llama-3.3-70b-versatile"

# qwen-qwq-32b
# llama-3.3-70b-versatile
llm = ChatOpenAI(
        model=model,
        temperature=0.3,
        max_tokens=None,
        timeout=None,
        max_retries=2,
        base_url=base_url,
        api_key=openai_api_key
    )

checkpointer = InMemorySaver()

# Read prompts
with open(os.path.join('.', "prompts", "english_agent.md"), 'r', encoding="utf-8") as f:
        english_agent_prompt = f.read()
        
with open(os.path.join('.', "prompts", "reviewer_agent.md"), 'r', encoding="utf-8") as f:
        reviewer_agent_prompt = f.read()

with open(os.path.join('.', "prompts", "work_experience_agent.md"), 'r', encoding="utf-8") as f:
        work_experience_agent_prompt = f.read()

with open(os.path.join('.', "prompts", "code_review_agent.md"), 'r', encoding="utf-8") as f:
        code_review_agent_prompt = f.read()

with open(os.path.join('.', "prompts", "summarize_agent.md"), 'r', encoding="utf-8") as f:
        summarize_agent_prompt = f.read()

with open(os.path.join('.', "prompts", "theory_reviewer_agent.md"), 'r', encoding="utf-8") as f:
        theory_reviewer_agent_prompt = f.read()

with open(os.path.join('.', "prompts", "hr_agent.md"), 'r', encoding="utf-8") as f:
        hr_agent_prompt = ChatPromptTemplate.from_template(f.read())

class InterviewState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    position: str
    remaining_steps: int
    candidate: str

_english_agent = create_react_agent(
    model=llm,
    tools=[],
    state_schema=InterviewState,
    prompt=english_agent_prompt
)

_reviewer_agent = create_react_agent(
    model=llm,
    tools=[],
    state_schema=InterviewState,
    prompt=reviewer_agent_prompt
)

_work_experience_agent = create_react_agent(
    model=llm,
    tools=[],
    state_schema=InterviewState,
    prompt=work_experience_agent_prompt
)

_code_reviewer_agent = create_react_agent(
    model=llm,
    tools=[],
    state_schema=InterviewState,
    prompt=code_review_agent_prompt
)

_hr_agent = create_react_agent(
    model=llm,
    tools=[],
    state_schema=InterviewState,
    prompt=hr_agent_prompt
)

_summarize_agent = create_react_agent(
    model=ChatOpenAI(
        model=model,
        temperature=0.1,
        max_tokens=None,
        timeout=None,
        max_retries=2,
        base_url=base_url,
        api_key=openai_api_key
    ),
    tools=[],
    state_schema=InterviewState,
    prompt=summarize_agent_prompt
)

_theory_reviewer_agent = create_react_agent(
    model=llm,
    tools=[],
    state_schema=InterviewState,
    prompt=theory_reviewer_agent_prompt
)

def add_message(state: InterviewState, message: str, is_human: bool = True) -> InterviewState:
    print(".......................... message processed")
    print(f"----- remaining steps: { state['remaining_steps']-1 } -----")
    new_message = HumanMessage(content=message) if is_human else AIMessage(content=message)
    return InterviewState(
        messages=state["messages"] + [new_message],
        remaining_steps=state["remaining_steps"] - 1
    )
    
def english_node(state: InterviewState):
    print("Invoking English agent.....")
    global _english_agent
    response = _english_agent.invoke(state)
    print(".......... message received .....")
    return add_message(state, response["messages"][-1].content, is_human=True)

def reviewer_node(state: InterviewState) -> Command[Literal["english_expert", END]]:
    print("Invoking Reviewer agent.....")
    global _reviewer_agent
    response = _reviewer_agent.invoke(state)
    print(".......... message received .....")
    
    goto = "english_expert"
    if "FINAL ANSWER" in response["messages"][-1].content:
        print("............. FINAL ANSWER received .....")
        goto = END
    elif state["remaining_steps"] <= 0:
        print("............. No more steps left .....")
        goto = END
        

    return Command(
        update=add_message(state, response["messages"][-1].content, is_human=True),
        goto=goto,
    )

def work_experience_node(state: InterviewState):
    print("Invoking Work Experience agent.....")
    global _work_experience_agent
    response = _work_experience_agent.invoke(state)
    print(".......... message received .....")
    return add_message(state, response["messages"][-1].content, is_human=True)

def code_reviewer_node(state: InterviewState):
    print("Invoking Code Reviewer agent.....")
    global _code_reviewer_agent
    response = _code_reviewer_agent.invoke(state)
    print(".......... message received .....")
    return add_message(state, response["messages"][-1].content, is_human=True)

def summarize_node(state: InterviewState):
    print("Invoking Summarize agent.....")
    global _summarize_agent
    response = _summarize_agent.invoke(state)
    print(".......... message received .....")
    return add_message(state, response["messages"][-1].content, is_human=False)

def hr_node(state: InterviewState): 
    print("Invoking HR agent.....")
    global _hr_agent
    state["candidate"] = state["messages"][-1].content
    response = _hr_agent.invoke(state)
    print(".......... message received .....")
    return add_message(state, response["messages"][-1].content, is_human=False)

def theory_reviewer_node(state: InterviewState):
    print("Invoking Theory Reviewer agent.....")
    global _theory_reviewer_agent
    response = _theory_reviewer_agent.invoke(state)
    print(".......... message received .....")
    return add_message(state, response["messages"][-1].content, is_human=True)

### candidate_folder is the folder where the candidate's files will be stored
### thread_id is a unique identifier for the interview thread, used to track the conversation state
##### if used by multiple chats, conversations will be mixed.
def evaluate_english(candidate_name:str, candidate_folder: str, timestamp: str, thread_id: str):
    output_english_interview_path = os.path.join('.', "output", candidate_folder, timestamp, "output_english.md")
    theory_interview_path = os.path.join('.', "input", candidate_name,"theory_interview.md")
    # output_theory_interview_path = os.path.join('.', "output", process_interview, "output_theory_interview.md")
    
    print("Starting English evaluation")
    with open(theory_interview_path, 'r', encoding="utf-8") as f:
        theory_interview = f.read()
    print("File read")
   
    print("Building Workflow")
    workflow = StateGraph(InterviewState)
    workflow.set_entry_point("english_expert")
    workflow.add_node("english_expert", english_node)
    workflow.add_node("reviewer", reviewer_node)
    
    workflow.add_edge("english_expert", "reviewer")
    workflow.add_edge("reviewer", END)
        
    graph = workflow.compile(checkpointer=checkpointer)
    print('Compiled Workflow')
    
    graph.get_graph().draw_mermaid_png(output_file_path=os.path.join('.', "output", candidate_folder, timestamp, "english_workflow.png"))
    config = {"configurable": {"thread_id": thread_id}}
    initial_state = InterviewState(
        messages=[HumanMessage(content=theory_interview)],
        remaining_steps=7
    )
    
    print('========= English Workflow Started ========')
    output  = graph.invoke(initial_state, config=config)
    print('========= English Workflow Finished =======')


    print("Output received, writing to file")
    with open(output_english_interview_path, "w+", encoding="utf-8") as f:
        for m in output["messages"]:
            if isinstance(m, HumanMessage):
                f.writelines(["\n*************** Human ****************\n", m.content,"\n"])
            elif isinstance(m, AIMessage):
                f.writelines(["\n*************** AI ****************\n", m.content, "\n"])
    print("English evaluation completed")
    
    # this needs to be fixed
    return re.sub(r'<think>.*?</think>', '', output["messages"][1].content, flags=re.DOTALL).strip() 

def summarize_work_experience(candidate_name:str, candidate_folder: str, timestamp: str):
    output_work_experience_path = os.path.join('.', "output", candidate_folder, timestamp, "output_work_experience.md")
    work_experience_path = os.path.join('.', "input", candidate_name,"work_experience.md")
    
    print("Starting Work Experience Summarization")
    with open(work_experience_path, 'r', encoding="utf-8") as f:
        work_experience = f.read()
    print("File read")
   
    print("Building Workflow")
    workflow = StateGraph(InterviewState)
    workflow.set_entry_point("work_experience_expert")
    workflow.add_node("work_experience_expert", work_experience_node)
    workflow.add_edge("work_experience_expert", END)
        
    graph = workflow.compile()
    print('Compiled Workflow')
    graph.get_graph().draw_mermaid_png(output_file_path=os.path.join('.', "output", candidate_folder, timestamp, "work_exp_workflow.png"))
    initial_state = InterviewState(
        messages=[HumanMessage(content=work_experience)],
        remaining_steps=1)
    
    print('========= Work Experience Workflow Started ========')
    output  = graph.invoke(initial_state)
    print('========= Work Experience Workflow Finished =======')


    print("Output received, writing to file")
    with open(output_work_experience_path, "w+", encoding="utf-8") as f:
        for m in output["messages"]:
            if isinstance(m, HumanMessage):
                f.writelines(["\n*************** Human ****************\n",m.content,"\n"])
            elif isinstance(m, AIMessage):
                f.writelines(["\n*************** AI ****************\n",m.content, "\n"])
    print("Work Experience Summarization completed")
    
    return re.sub(r'<think>.*?</think>', '', output["messages"][-1].content, flags=re.DOTALL).strip()
    
def review_code(candidate_name:str, candidate_folder: str, timestamp: str):
    output_challenge_interview_path = os.path.join('.', "output", candidate_folder, timestamp, "output_challenge_interview.md")
    challenge_interview_path = os.path.join('.', "input", candidate_name,"challenge_interview.md")
    
    print("Starting Code Review")
    with open(challenge_interview_path, 'r', encoding="utf-8") as f:
        work_experience = f.read()
    print("File read")
   
    print("Building Workflow")
    workflow = StateGraph(InterviewState)
    workflow.set_entry_point("code_reviewer")
    workflow.add_node("code_reviewer", code_reviewer_node)
    workflow.add_edge("code_reviewer", END)
        
    graph = workflow.compile()
    print('Compiled Workflow')
    graph.get_graph().draw_mermaid_png(output_file_path=os.path.join('.', "output", candidate_folder, timestamp, "code_review_workflow.png"))
    initial_state = InterviewState(
        messages=[HumanMessage(content=work_experience)],
        remaining_steps=1)
    
    print('========= Code Review Workflow Started ========')
    output  = graph.invoke(initial_state)
    print('========= Code Review Workflow Finished =======')


    print("Output received, writing to file")
    with open(output_challenge_interview_path, "w+", encoding="utf-8") as f:
        for m in output["messages"]:
            if isinstance(m, HumanMessage):
                f.writelines(["\n*************** Human ****************\n",m.content,"\n"])
            elif isinstance(m, AIMessage):
                f.writelines(["\n*************** AI ****************\n",m.content, "\n"])
    print("Code Review completed")
    
    return re.sub(r'<think>.*?</think>', '', output["messages"][-1].content, flags=re.DOTALL).strip()

def summarize_outputs(candidate_folder: str, outputs: str, timestamp: str, position: str):
    output_summary_path = os.path.join('.', "output", candidate_folder, timestamp, "output_summary.md")
    print("Starting Summarization")
   
    print("Building Workflow")
    workflow = StateGraph(InterviewState)
    workflow.set_entry_point("summarize_expert")
    workflow.add_node("summarize_expert", summarize_node)
    workflow.add_node("hr_assistant", hr_node)
    
    workflow.add_edge("summarize_expert", "hr_assistant")
    workflow.add_edge("hr_assistant", END)
        
    graph = workflow.compile()
    print('Compiled Workflow')
    graph.get_graph().draw_mermaid_png(output_file_path=os.path.join('.', "output", candidate_folder, timestamp, "output.png"))
    
    initial_state = InterviewState(
        messages=[HumanMessage(content=outputs)],
        remaining_steps=2,
        position=position,
        candidate="to be completed by summary agent"
        )
    
    print('========= Summarize Workflow Started ========')
    output  = graph.invoke(initial_state)
    print('========= Summarize Workflow Finished =======')


    print("Output received, writing to file")
    with open(output_summary_path, "w+", encoding="utf-8") as f:
        for m in output["messages"]:
            m.content = re.sub(r'<think>.*?</think>', '', m.content, flags=re.DOTALL).strip()
            if isinstance(m, HumanMessage):
                f.writelines(["\n*************** Human ****************\n\n",m.content,"\n\n"])
            elif isinstance(m, AIMessage):
                f.writelines(["\n*************** AI ****************\n\n",m.content, "\n\n"])
    print("Code Review completed")
    
def evaluate_theory(candidate_name:str, candidate_folder: str, timestamp: str):
    output_theory_interview_path = os.path.join('.', "output", candidate_folder, timestamp, "output_theory_interview.md")
    theory_interview_path = os.path.join('.', "input", candidate_name,"theory_interview.md")
    
    print("Starting Theory Review")
    with open(theory_interview_path, 'r', encoding="utf-8") as f:
        theory_interview = f.read()
    print("File read")
   
    print("Building Workflow")
    workflow = StateGraph(InterviewState)
    workflow.set_entry_point("theory_reviewer")
    workflow.add_node("theory_reviewer", theory_reviewer_node)
    workflow.add_edge("theory_reviewer", END)
        
    graph = workflow.compile()
    print('Compiled Workflow')
    graph.get_graph().draw_mermaid_png(output_file_path=os.path.join('.', "output", candidate_folder, timestamp, "theory_workflow.png"))
    initial_state = InterviewState(
        messages=[HumanMessage(content=theory_interview)],
        remaining_steps=1)
    
    print('========= Theory Review Workflow Started ========')
    output  = graph.invoke(initial_state)
    print('========= Theory Review Workflow Finished =======')


    print("Output received, writing to file")
    with open(output_theory_interview_path, "w+", encoding="utf-8") as f:
        for m in output["messages"]:
            if isinstance(m, HumanMessage):
                f.writelines(["\n*************** Human ****************\n",m.content,"\n"])
            elif isinstance(m, AIMessage):
                f.writelines(["\n*************** AI ****************\n",m.content, "\n"])
    print("Theory Review completed")
    
    return re.sub(r'<think>.*?</think>', '', output["messages"][-1].content, flags=re.DOTALL).strip()
 
# "bad", "good_junior" ,"fullstack_sr_alan", 
# gaurav_vijayvergiya
# dhinesh_gundam
# vishal_singh
# akhil_matcha
# camilo_leonel_amadio
# muskan_agarwal; imran_khan
# pankaj_balchandani
# manthan_bhikadiya
candidates = ["manthan_bhikadiya"]
for candidate in candidates:
    
    now_local = datetime.now()
    timestamp = str(now_local).replace('.', '_').replace(':', '.').replace(' ', '_')
    candidate_folder = candidate
    os.makedirs(os.path.join('.', "output", candidate, timestamp), exist_ok=True) # exist_ok avoids errors if the directory exists

    #AI Engineer JR
    #"AI Engineer SSR/SR"
    position = "AI Engineer Semi-Senior / Senior"
    english_output = evaluate_english(candidate_name=candidate, candidate_folder=candidate_folder, thread_id=candidate_folder, timestamp=timestamp)
    work_experience_output = summarize_work_experience(candidate_name=candidate, candidate_folder=candidate_folder, timestamp=timestamp)
    code_review_output = review_code(candidate_name=candidate, candidate_folder=candidate_folder, timestamp=timestamp)
    theory_review_output = evaluate_theory(candidate_name=candidate, candidate_folder=candidate_folder, timestamp=timestamp)
    
    summarize_outputs(candidate_folder=candidate_folder, timestamp=timestamp, position=position, outputs=
    f"""# English Output:\r\n\r\n{english_output}\r\n# Work Experience Output\r\n{work_experience_output}\r\n# Code Review Output\r\n{code_review_output}\r\n# Theory Review Output\r\n{theory_review_output}\r\n""")
