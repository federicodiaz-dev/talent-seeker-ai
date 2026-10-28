import logging
from office365.sharepoint.client_context import ClientContext
from app.services.authorization_service import AuthorizationService
from app.utils.error_handling import global_retry, SharePointError

from office365.runtime.auth.client_credential import ClientCredential

class SharePointListService:
    def __init__(self, site_url: str):
        auth_service = AuthorizationService()
        access_token = auth_service.get_sharepoint_token()
        #self.context = ClientContext(site_url).with_access_token(access_token)
        self.context = ClientContext(site_url).with_credentials(ClientCredential('', ''))

    @global_retry()
    def get_list_items(self, list_id: str, filter_query: str = ''):
        try:
            sp_list = self.context.web.lists.get_by_id(list_id)
            items = sp_list.items.filter(filter_query).get().execute_query()
            logging.info(f"Retrieved {len(items)} items from list with ID '{list_id}'.")
            return [item.properties for item in items]
        except Exception as e:
            logging.error(f"Error retrieving items from list with ID '{list_id}': {e}")
            raise SharePointError(f"Error retrieving items from list with ID '{list_id}': {e}")
   
    @global_retry()
    def add_list_item(self, list_id: str, item_properties: dict):
        try:
            sp_list = self.context.web.lists.get_by_id(list_id)
            item = sp_list.add_item(item_properties).execute_query()
            logging.info('Item added successfully.')
            return item.properties
        except Exception as e:
            logging.error(f"Error adding items to list with ID '{list_id}': {e}")
            raise SharePointError(f"Error adding items to list with ID '{list_id}': {e}")

    @global_retry()
    def update_list_item(self, list_id: str, item_id: int, updated_properties: dict):
        try:
            sp_list = self.context.web.lists.get_by_id(list_id)
            item_to_update = sp_list.get_item_by_id(item_id)

            for key, value in updated_properties.items():
                item_to_update.set_property(key, value)

            item_to_update.update()
            self.context.execute_query()

            logging.info(f"Item with ID {item_id} updated successfully.")
            return True
        except Exception as e:
            logging.error(f"Error updating item to list ID '{list_id}' with item ID '{item_id}': {e}")
            raise SharePointError(f"Error updating item to list ID '{list_id}' with item ID '{item_id}': {e}")

    @global_retry()
    def delete_list_item(self, list_id: str, item_id: int):
        try:
            sp_list = self.context.web.lists.get_by_id(list_id)
            item = sp_list.items.get_by_id(item_id)
            item.delete_object()
            self.context.execute_query()
            logging.info(f"Item with ID {item_id} deleted successfully.")
            return True
        except Exception as e:
            logging.error(f"Error deleting item to list ID '{list_id}' with item ID '{item_id}': {e}")
            raise SharePointError(f"Error deleting item to list ID '{list_id}' with item ID '{item_id}': {e}")
