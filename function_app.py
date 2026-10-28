import azure.functions as func
import logging
from dotenv import load_dotenv
import os
from app.services.teams_service import TeamsService
import json
from app.services.sharepoint_service import SharePointListService
from app.services.authorization_service import AuthorizationService
from app.services.keyvault_service import KeyVaultService

load_dotenv()

CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
TENANT_ID = os.getenv("AZURE_TENANT_ID")
REDIRECT_URI = os.getenv("AZURE_REDIRECT_URI")
REFRESH_TOKEN = os.getenv("AZURE_REFRESH_TOKEN")
TEAM_ID = os.getenv("TEAM_ID")
CHANNEL_ID = os.getenv("CHANNEL_ID")
SITE_URL = os.getenv("SITE_URL")
LIST_ID = os.getenv("TECH_RECRUITING_LIST_ID")
RT_SECRET_NAME = os.getenv("REFRESH_TOKEN_SECRET_NAME")
REFRESH_TOKEN_RENEWAL = os.getenv("REFRESH_TOKEN_RENEWAL_ENABLED")
REFRESH_TOKEN_CRON = os.getenv("REFRESH_TOKEN_CRON")
AKV_URL = os.getenv("AKV_URL")

app = func.FunctionApp()

@app.function_name(name="HealthCheck")
@app.route(route="health", auth_level=func.AuthLevel.ANONYMOUS)
def health_check(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('[HealthCheck] Health check endpoint called.')
    return func.HttpResponse(
        json.dumps({"message": "OK"}),
        status_code=200,
        mimetype="application/json"
    )

@app.function_name(name="GetChannelMessages")
@app.route(route="GetChannelMessages", auth_level=func.AuthLevel.ANONYMOUS)
def get_channel_messages(req: func.HttpRequest) -> func.HttpResponse:
    try:
        teams_service = TeamsService(TEAM_ID, CHANNEL_ID)
        messages = teams_service.run_get_recent_messages()
        return func.HttpResponse(
            json.dumps({"messages": messages}, ensure_ascii=False),
            status_code=200,
            mimetype="application/json"
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": f"Error fetching channel messages: {e}"}),
            status_code=500,
            mimetype="application/json"
        )

@app.function_name(name="MarkCandidateMessageProcessed")
@app.route(route="MarkCandidateMessageProcessed", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
def mark_candidate_message_processed(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body = req.get_json()
        message_id = body.get("message_id")
        if not message_id:
            return func.HttpResponse(
                json.dumps({"error": "Missing 'message_id' in request body."}),
                status_code=400,
                mimetype="application/json"
            )
        teams_service = TeamsService(TEAM_ID, CHANNEL_ID)
        teams_service.mark_candidate_message_as_processed(message_id)
        return func.HttpResponse(
            json.dumps({"message": "Message marked as processed."}),
            status_code=200,
            mimetype="application/json"
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": f"Error marking message as processed: {e}"}),
            status_code=500,
            mimetype="application/json"
        )

@app.function_name(name="ReplyToMessage")
@app.route(route="ReplyToMessage", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
def reply_to_message(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body = req.get_json()
        message_id = body.get("message_id")
        reply_content = body.get("reply_content")
        if not message_id or not reply_content:
            return func.HttpResponse(
                json.dumps({"error": "Missing 'message_id' or 'reply_content' in request body."}),
                status_code=400,
                mimetype="application/json"
            )
        teams_service = TeamsService(TEAM_ID, CHANNEL_ID)
        reply_id = teams_service.run_send_thread_reply(message_id, reply_content)
        return func.HttpResponse(
            json.dumps({"message": "Reply sent", "reply_id": reply_id}),
            status_code=200,
            mimetype="application/json"
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": f"Error replying to message: {e}"}),
            status_code=500,
            mimetype="application/json"
        )

@app.function_name(name="GetSharePointListItems")
@app.route(route="GetSharePointListItems", auth_level=func.AuthLevel.ANONYMOUS)
def get_sharepoint_list_items(req: func.HttpRequest) -> func.HttpResponse:
    try:
        filter_query = ''
        sp_service = SharePointListService(SITE_URL)
        items = sp_service.get_list_items(LIST_ID, filter_query)
        return func.HttpResponse(
            json.dumps({"items": items}, ensure_ascii=False),
            status_code=200,
            mimetype="application/json"
        )
    except Exception as e:
        return func.HttpResponse(
            json.dumps({"error": f"Error fetching SharePoint list items: {e}"}),
            status_code=500,
            mimetype="application/json"
        )

@app.function_name(name="RenewRefreshToken")
@app.schedule(schedule=REFRESH_TOKEN_CRON, arg_name="myTimer", run_on_startup=False, use_monitor=True)
def renew_refresh_token_endpoint(myTimer: func.TimerRequest) -> None:
    try:
        if str(REFRESH_TOKEN_RENEWAL).lower() != "true":
            logging.info("Refresh token renewal is disabled.")
            return
        kv_service = KeyVaultService(AKV_URL)
        new_refresh_token = AuthorizationService().renew_refresh_token()
        kv_service.save_secret(RT_SECRET_NAME, new_refresh_token)
        logging.info("Refresh token renewed successfully and saved in Key Vault.")
    except Exception as e:
        logging.error(f"Error renewing refresh token: {e}")