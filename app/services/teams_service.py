import sys
import asyncio
import aiohttp
import logging
from datetime import datetime
from typing import List, Dict, Any
from app.services.authorization_service import AuthorizationService
import re

class TeamsService:

    BASE_URL = "https://graph.microsoft.com/v1.0"

    def __init__(
        self,
        team_id: str,
        channel_id: str,
        fetch_count: int = 50,
        max_threads: int = 10,
        max_replies: int = 50,
    ):
        try:
            auth_service = AuthorizationService()
            self._token = auth_service.get_teams_token()
        except Exception as e:
            logging.error(f"[TeamsGraphService] Authentication error: {e}")
            sys.exit(1)

        self.team_id = team_id
        self.channel_id = channel_id
        self.fetch_count = fetch_count
        self.max_threads = max_threads
        self.max_replies = max_replies

        self.headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }
        self.base_channel_url = (
            f"{self.BASE_URL}/teams/{self.team_id}/channels/{self.channel_id}"
        )

    async def get_recent_messages(self) -> List[Dict[str, Any]]:
        url = f"{self.base_channel_url}/messages?$top={self.fetch_count}"
        async with aiohttp.ClientSession(headers=self.headers) as session:
            async with session.get(url) as resp:
                resp.raise_for_status()
                data = await resp.json()

        msgs = data.get("value", []) or []
        msgs.sort(
            key=lambda m: self._parse_graph_datetime(m.get("createdDateTime")),
            reverse=True
        )
        latest = msgs[: self.fetch_count]
        return list(reversed(latest))

    async def get_replies(self, thread_id: str) -> List[Dict[str, Any]]:
        url = (
            f"{self.base_channel_url}/messages/{thread_id}/replies?"
            f"$top={self.max_replies}"
        )
        async with aiohttp.ClientSession(headers=self.headers) as session:
            async with session.get(url) as resp:
                resp.raise_for_status()
                data = await resp.json()
        return data.get("value", []) or []

    async def send_channel_message(self, content: str) -> str:
        url = f"{self.base_channel_url}/messages"
        payload = {"body": {"contentType": "text", "content": content}}
        async with aiohttp.ClientSession(headers=self.headers) as session:
            async with session.post(url, json=payload) as resp:
                resp.raise_for_status()
                data = await resp.json()
        return data.get("id", "")

    async def send_thread_reply(self, thread_id: str, reply_content: str) -> str:
        url = f"{self.base_channel_url}/messages/{thread_id}/replies"
        payload = {"body": {"contentType": "text", "content": reply_content}}
        async with aiohttp.ClientSession(headers=self.headers) as session:
            async with session.post(url, json=payload) as resp:
                resp.raise_for_status()
                data = await resp.json()
        return data.get("id", "")
    
    async def send_message_reaction(self, message_id: str, reaction_type: str) -> None:
        url = f"{self.base_channel_url}/messages/{message_id}/setReaction"
        payload = {"reactionType": reaction_type}
        async with aiohttp.ClientSession(headers=self.headers) as session:
            async with session.post(url, json=payload) as resp:
                resp.raise_for_status()
        return
    
    def mark_candidate_message_as_processed(self, message_id: str):
        self.run_send_message_reaction(message_id=message_id, reaction_type='🤖')
    
    def run_send_channel_message(self, content: str) -> str:
        return asyncio.run(self.send_channel_message(content))

    def run_send_thread_reply(self, thread_id: str, reply_content: str) -> str:
        return asyncio.run(self.send_thread_reply(thread_id, reply_content))

    def run_send_message_reaction(self, message_id: str, reaction_type: str) -> None:
        return asyncio.run(self.send_message_reaction(message_id, reaction_type))
    
    def run_get_recent_messages(self) -> None:
        return asyncio.run(self.get_recent_messages())

    def _parse_graph_datetime(self, dt_str: str) -> datetime:
        dt_str = dt_str.replace("Z", "+00:00")
        match = re.match(r"(.*T\d{2}:\d{2}:\d{2})(\.\d+)?(\+\d{2}:\d{2})", dt_str)
        if match:
            base, ms, tz = match.groups()
            if ms:
                ms = ms.ljust(7, "0")
            else:
                ms = ""
            dt_str = f"{base}{ms}{tz}"
        return datetime.fromisoformat(dt_str)

