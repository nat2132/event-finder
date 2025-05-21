import hmac
import hashlib
import os
import json

secret = os.getenv("CHAPA_WEBHOOK_SECRET", "my_webhook_secret_123")
payload = {
    "event": "charge.success",
    "data": {
        "status": "success",
        "tx_ref": "pro-user_abc123",
        "amount": 100,
        "custom_data": {
            "plan": "pro",
            "user_id": 6
        }
    }
}
body = json.dumps(payload, separators=(',', ':'))  # Minified JSON
signature = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
print(signature)