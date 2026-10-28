from azure.functions import HttpRequest, HttpResponse
import logging
from app.agents.english_agent import load_english_agent
from app.agents.ai_engineer_agent import load_ai_engineer_agent
from app.agents.coding_agent import load_coding_agent
from app.agents.recruiting_agent import load_recruiting_agent
from app.services.msteams_service import MSTeamsService
from langchain_community.callbacks import get_openai_callback
from langchain_core.runnables import RunnableParallel

async def evaluate(req: HttpRequest) -> HttpResponse:
    logging.info('Python HTTP trigger function processed a request.')
    
    msteams_service = MSTeamsService()
    
    logging.info('Get Interview')
    # ai_msg = await msteams_service.get_interview(user_input)

    theory_interview = msteams_service.get_local_interview('theory_interview')       

    challenge_interview = msteams_service.get_local_interview('challenge_interview')

    logging.info('Loading agents...')
    english_agent = load_english_agent()
    # ai_engineer_agent = load_ai_engineer_agent()
    coding_agent = load_coding_agent()
    # recruiting_agent = load_recruiting_agent()
    logging.info('Agents loaded.')
    
    
    # Run agents in parallel
    # sequence = RunnableParallel(
    #     english=english_agent,
    #     ai=ai_engineer_agent,
    #     code=coding_agent
    # )

    with get_openai_callback() as cb:
        logging.info('Asking agents.')
        # result = sequence.invoke("\n".join(map(str, interview_input)))
        english_output = english_agent.invoke({"interview":theory_interview})
        coding_agent_output = coding_agent.invoke({"interview":challenge_interview})
        
        # result = recruiting_agent.invoke(detailed_feedback)

        logging.info(f"""Usage:
                     Prompt tokens: {cb.prompt_tokens}
                     Completion tokens: {cb.completion_tokens}
                     Total tokens: {cb.total_tokens}
                     Cost (USD): ${cb.total_cost:.6f}""")

    # response = openai_service.evaluate_interview()
    # Detailed response

    return HttpResponse(
        "\n\n===============================================================================================\n\n".join([
        # "Summary: \n" + result.content,
        "English review: \n" + english_output.content, 
        # "AI review: \n" + detailed_feedback['ai'].content,
        "Code review: \n" + coding_agent_output.content]
        ),
        status_code=200,
    )