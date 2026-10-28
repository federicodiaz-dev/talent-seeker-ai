from dotenv import load_dotenv
import os
from msal import ConfidentialClientApplication

load_dotenv()

class AuthorizationService:
    def __init__(self):
        self.client_id = os.getenv("CLIENT_ID")
        self.client_secret = os.getenv("CLIENT_SECRET")
        self.tenant_id = os.getenv("AZURE_TENANT_ID")
        self.refresh_token = os.getenv("MSAL_REFRESH_TOKEN")
        self.teams_scopes = [
            "https://graph.microsoft.com/ChannelMessage.Send",
            "https://graph.microsoft.com/ChannelMessage.Read.All",
            "https://graph.microsoft.com/Channel.ReadBasic.All",
            "https://graph.microsoft.com/ChannelMember.Read.All"
        ]
        self.sp_scopes = [
            "https://microsoft.sharepoint.com/.default"
        ]

    def _get_app(self):
        return ConfidentialClientApplication(
            client_id=self.client_id,
            client_credential=self.client_secret,
            authority=f"https://login.microsoftonline.com/{self.tenant_id}"
        )

    def _get_token(self, scopes, token_key="access_token"):
        app = self._get_app()
        result = app.acquire_token_by_refresh_token(
            refresh_token=self.refresh_token,
            scopes=scopes
        )
        if not result or token_key not in result:
            error = result.get("error", "<no-data>") if result else "<result=None>"
            desc = result.get("error_description", "") if result else ""
            raise RuntimeError(
                f"Error obtaining {token_key} with refresh_token: {error} – {desc}"
            )
        return result[token_key]

    def get_teams_token(self) -> str:
        return self._get_token(self.teams_scopes, token_key="access_token")

    def get_sharepoint_token(self) -> str:
        return self._get_token(self.sp_scopes, token_key="access_token")

    def renew_refresh_token(self) -> str:
        return self._get_token(["https://graph.microsoft.com/.default"], token_key="refresh_token")