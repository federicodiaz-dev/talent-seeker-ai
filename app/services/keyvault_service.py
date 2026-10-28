import logging
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

class KeyVaultService:
    def __init__(self, vault_url: str):
        if not vault_url:
            raise ValueError("KeyVault has no value.")
        self._secret_client = SecretClient(vault_url=vault_url, credential=DefaultAzureCredential())

    def get_secret(self, secret_name: str) -> str:
        logging.info(f"Retrieving secret '{secret_name}'")
        secret = self._secret_client.get_secret(secret_name)
        return secret.value

    def save_secret(self, secret_name: str, value: str):
        logging.info(f"Saving secret '{secret_name}'")
        self._secret_client.set_secret(secret_name, value)