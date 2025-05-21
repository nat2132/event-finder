import requests
import uuid
import os

CHAPA_SECRET_KEY = os.getenv("CHAPA_SECRET_KEY")
CHAPA_BASE_URL = "https://api.chapa.co/v1"


# Docs: https://developer.chapa.co/docs/initialize

def initialize_payment(email, amount, first_name, last_name, tx_ref=None, callback_url=None, return_url=None, currency="ETB", custom_data=None):
    if not tx_ref:
        tx_ref = str(uuid.uuid4())
    headers = {"Authorization": f"Bearer {CHAPA_SECRET_KEY}"}
    data = {
        "amount": str(amount),
        "currency": currency,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "tx_ref": tx_ref,
    }
    if callback_url:
        data["callback_url"] = callback_url
    if return_url:
        data["return_url"] = return_url
    if custom_data:
        data["customization"] = custom_data

    try:
        response = requests.post(f"{CHAPA_BASE_URL}/transaction/initialize", headers=headers, json=data)
        return response.json()
    except Exception as e:
        return {"status": "failed", "message": str(e)}


def verify_payment(tx_ref):
    headers = {"Authorization": f"Bearer {CHAPA_SECRET_KEY}"}
    try:
        response = requests.get(f"{CHAPA_BASE_URL}/transaction/verify/{tx_ref}", headers=headers)
        return response.json()
    except Exception as e:
        return {"status": "failed", "message": str(e)}
