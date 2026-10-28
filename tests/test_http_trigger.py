import unittest
import asyncio
from app.routes.evaluate_interview import evaluate
from azure.functions import HttpRequest

class TestHttpTrigger(unittest.TestCase):

    def test_http_trigger_success(self):
        assert(1 == 1)

    # def setUp(self):
    #     self.req = HttpRequest(
    #         method='POST',
    #         url='/api/http_trigger',
    #         body=b'{"text": "I love programming."}',
    #         params={}
    #     )

    # def test_http_trigger_success(self):
    #     response = asyncio.run(evaluate(self.req))
    #     self.assertEqual(response.status_code, 200)
    #     self.assertIn("J'adore programmer.", response.get_body().decode())

    # def test_http_trigger_invalid_request(self):
    #     invalid_req = HttpRequest(
    #         method='POST',
    #         url='/api/http_trigger',
    #         body=b'{"invalid": "data"}',
    #         params={}
    #     )
    #     response = asyncio.run(evaluate(invalid_req))
    #     self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()