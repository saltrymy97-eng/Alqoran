from http.server import BaseHTTPRequestHandler
import json
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services import ask_ai, smart_classify

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        data = json.loads(body)
        question = data.get('question', '')
        
        if question:
            category = smart_classify(question)
            reply = ask_ai(question, category)
        else:
            reply = "يرجى كتابة سؤال."
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"reply": reply}).encode())
