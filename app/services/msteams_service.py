from dataclasses import dataclass
from bs4 import BeautifulSoup
from azure.identity import DeviceCodeCredential, DefaultAzureCredential, InteractiveBrowserCredential
from msgraph.graph_service_client import GraphServiceClient
from msgraph.generated.chats.item.messages.messages_request_builder import MessagesRequestBuilder
from kiota_abstractions.base_request_configuration import RequestConfiguration
import json
import logging
import os
import re
from typing import List, Dict


@dataclass
class QAPair:
    question: str
    answer: str
    
class MSTeamsService:
    def __init__(self):
        scopes = ['User.Read', 'Chat.Read', 'ChatMessage.Read']
        # os.environ['AZURE_CLIENT_ID'] = 'd19b2462-fdf9-48b5-bf12-2dee16d50fb8'
        # os.environ['AZURE_TENANT_ID'] = 'a1dd2fc9-baa2-4940-913a-554b9aff40ef'

        # TODO: Fix this
        credential = InteractiveBrowserCredential(
            client_id=os.environ.get('AZURE_CLIENT_ID'),
            tenant_id=os.environ.get('AZURE_TENANT_ID'),
            redirect_uri="http://localhost:8400", #sdk port
            scopes=scopes,
        )

        # credential = DefaultAzureCredential(
        #     exclude_managed_identity_credential=True,
        #     exclude_environment_credential=True,
        #     exclude_visual_studio_code_credential=True,
        #     exclude_shared_token_cache_credential=True,
        # )
        
        self.graph_client = GraphServiceClient(credentials=credential, scopes=scopes)

    async def get_interview(self, text: str) -> str:
        query_params = MessagesRequestBuilder.MessagesRequestBuilderGetQueryParameters(
            top = 2,
        )
        request_configuration = RequestConfiguration(
            query_parameters = query_params,
        )
        
        # Make this async
        result = await self.graph_client.chats.by_chat_id('19:meeting_ZWYwZmRmNDctYzUyZS00MDQ5LTgwODQtZjFkN2E5NjhhZTc4@thread.v2').messages.get(request_configuration = request_configuration)
        
        print(result)
        
        return json.dumps([msg.__dict__ for msg in result.value], indent=2)
    
    def strip_html(self, text):
        return BeautifulSoup(text, "html.parser").get_text()


    def get_local_interview(self, file_name) -> str:
        with open(f'./docs/{file_name}.md', 'r') as f:
            data = f.read()

        return data
    
    def process_message(self, user, content: str, attachments) -> str:
        ## Move tenant id to env variables
        userType = user.get("userIdentityType", "")
        tenantId = user.get("tenantId", "")
        craftlabsTenantId = os.getenv("AZURE_TENANT_ID")
        prefix = "Question: " if userType == "aadUser" and tenantId == craftlabsTenantId else "Answer: "
        
        match content:
            case c if re.fullmatch("<p><attachment.*?</attachment></p>", c):
                # Process attachments
                ## TODO: requires successful connection to Graph API
                ## Will have to look inside attachments.content json and get the codeSnippetUrl
                ## For now, the json has been hardcoded
                content = self.strip_html(c)
            case c if re.match("<p.*?", c):
                # Regular message
                content = self.strip_html(c).replace("\n", " ")
            case _:
                # Regular message
                content = self.strip_html(c).replace("\n", " ")

        return prefix + content
    
    def extract_chat(self, messages: List[Dict]) -> List[str]:
        chat: List[str] = []
        for msg in messages:
            if msg.get("from"):
                chat.append(
                    self.process_message(
                        msg.get("from").get("user", {}),
                        msg.get("body").get("content"),
                        msg.get("attachments"))
                )
        
        return chat
    
