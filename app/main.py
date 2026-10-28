from azure import functions as func
import logging
from app.utils.env_initializer import init_env_variables
from app.routes.evaluate_interview import evaluate
from dotenv import load_dotenv

load_dotenv()

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Initialize environment variables
init_env_variables()

# Register routes
app.route(route="http_trigger")(evaluate)