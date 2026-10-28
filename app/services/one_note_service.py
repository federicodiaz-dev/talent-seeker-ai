import requests

# Azure AD access token (replace with your valid token)
access_token = 'YOUR_ACCESS_TOKEN'

# OneNote section ID where the page will be created
section_id = '1-c5064b76-7b1e-47b9-8e8a-4005cdf32267'

# HTML content for the OneNote page
html_content = """<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Page from Python</title>
  </head>
  <body>
    <p>Hello from <b>Python + requests</b>!</p>
  </body>
</html>"""

# Prepare the multipart/form-data payload
files = {
    'presentation': ('page.html', html_content, 'text/html')
}

# Set the authorization header
headers = {
    "Authorization": f"Bearer {access_token}"
}

# Make the POST request to create the OneNote page
response = requests.post(
    f'https://graph.microsoft.com/v1.0/me/onenote/sections/{section_id}/pages',
    headers=headers,
    files=files
)

print(response.status_code)
try:
    print(response.json())
except Exception:
    print(response.text)


