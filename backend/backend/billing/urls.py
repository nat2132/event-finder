from django.urls import path
from .views import initialize_chapa_payment, billing_history, chapa_webhook, verify_transaction

urlpatterns = [
    # Billing and payment endpoints
    path('initialize-chapa-payment/', initialize_chapa_payment),
    path('user/billing-history/', billing_history),
    path('payments/webhook/', chapa_webhook),
    path('verify-transaction/', verify_transaction),
]
