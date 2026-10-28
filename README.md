# purmamarca-project-template

Used for provisioning new projects for Purmamarca

## How to use this repo

Create a new repository based on this template

## 01. Setup Repository Variables

- Add "PROJECT_NAME" repository variable with your project name.

## 02. Actions

[01. Update Issue Template with Project Name](https://github.com/Craft-Labs/purmamarca-project-template/actions/workflows/update-project-name.yml)  
Used to prepare the ISSUE_TEMPLATE/feature_request.md to include your [ProjectName] prefix.

[02. Create GitHub Issues from Parameter](https://github.com/Craft-Labs/purmamarca-project-template/actions/workflows/create-issues.yml)  
Used to create GitHub Issues sent as a CSV string, for example: "First issue from input,Second issue from input"
Output will be:

- [ProjectName] First issue from input
- [ProjectName] Second issue from input

[Build and Deploy Azure Function App (Python)](https://github.com/Craft-Labs/purmamarca-project-template/actions/workflows/python-function-build-deploy.yml)  
Used when implementing the repo for a python function app. It covers building, linting, and deploying to Function App.
Required variables to be configured:

- FUNCTION_APP_WORKING_DIRECTORY. For example `functions_apps/linkedin-profile-processor`
- FUNCTION_APP_NAME. Name of your Azure Resource. Used for deployment and storing artifacts. For example `fa-linkedin-searcher-dev`

In VS Code Extensions

- Azure Functions v1.17.1
- Azurite V3
- Python v2025.4.0

In Windows

- Azure Functions Core Tools v4
- Python v3.11.9 (pyenv recommended)
