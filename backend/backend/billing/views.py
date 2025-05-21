from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import json
import hmac
import hashlib
import uuid

from users.models import ClerkUser
from .models import BillingHistory
from .serializers import BillingHistorySerializer
from .chapa import initialize_payment, verify_payment
from django.conf import settings

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initialize_chapa_payment(request):
    # Get the clerk_user from the request (added by middleware)
    clerk_user_info = getattr(request, 'clerk_user', None)
    if not clerk_user_info or not isinstance(clerk_user_info, dict):
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
    clerk_id = clerk_user_info.get('sub')
    if not clerk_id:
        return Response({'error': 'Invalid authentication'}, status=status.HTTP_401_UNAUTHORIZED)
        
    try:
        user = ClerkUser.objects.get(clerk_id=clerk_id)
    except ClerkUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Debug: log the request data
    print("[DEBUG] Payment request data:", request.data)
    
    # Get payment details from request
    plan = request.data.get('plan')
    amount = request.data.get('amount')
    first_name = request.data.get('first_name', user.full_name.split()[0] if user.full_name else 'User')
    last_name = request.data.get('last_name', user.full_name.split()[-1] if user.full_name and len(user.full_name.split()) > 1 else 'Account')
    
    # Debug: log extracted values
    print(f"[DEBUG] Extracted plan: {plan}, amount: {amount}")
    
    if not plan or not amount:
        print(f"[DEBUG] Missing plan or amount. plan={plan}, amount={amount}")
        return Response({'error': 'Plan and amount are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate a transaction reference
    tx_ref = f"EF-{uuid.uuid4().hex[:8].upper()}"
    
    # Get event info if this is an event ticket payment
    event_info = request.data.get('event_info', {})
    custom_data = {
        "user_id": user.id,
        "plan": plan
    }
    
    # Add event information to custom data if available
    if event_info:
        custom_data["event_info"] = event_info
    
    # Initialize payment with Chapa
    result = initialize_payment(
        email=user.email,
        amount=amount,
        first_name=first_name,
        last_name=last_name,
        tx_ref=tx_ref,
        callback_url=request.data.get('callback_url'),
        return_url=request.data.get('return_url'),
        currency="ETB",
        custom_data=custom_data
    )
    
    # Debug: log result
    print("[DEBUG] Chapa initialization result:", result)
    
    # Create billing history record (payment initiated)
    BillingHistory.objects.create(
        user=user,
        plan=plan,
        amount=amount,
        tx_ref=tx_ref,
        status="initiated"
    )
    
    return Response(result)

@csrf_exempt
@api_view(['POST'])
def chapa_webhook(request):
    # Verify the webhook signature
    webhook_secret = settings.CHAPA_WEBHOOK_SECRET
    signature = request.headers.get('x-chapa-signature')
    
    if not signature:
        return Response({'error': 'Missing signature'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Compute signature
    payload = request.body
    computed_sig = hmac.new(webhook_secret.encode(), payload, hashlib.sha256).hexdigest()
    
    if signature != computed_sig:
        return Response({'error': 'Invalid signature'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Parse the webhook payload
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return Response({'error': 'Invalid JSON payload'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Handle the event
    event = data.get('event')
    tx_ref = data.get('data', {}).get('tx_ref')
    
    if not tx_ref:
        return Response({'error': 'Missing tx_ref'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Find billing record
    try:
        billing = BillingHistory.objects.get(tx_ref=tx_ref)
    except BillingHistory.DoesNotExist:
        return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Update status based on event
    if event == 'charge.completed':
        billing.status = 'completed'
        
        # Update user's plan if payment was successful
        user = billing.user
        user.plan = billing.plan
        user.save(update_fields=['plan'])
        
    elif event == 'charge.failed':
        billing.status = 'failed'
        
    billing.save()
    
    return Response({'status': 'success'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def billing_history(request):
    # Get the clerk_user from the request (added by middleware)
    clerk_user_info = getattr(request, 'clerk_user', None)
    if not clerk_user_info or not isinstance(clerk_user_info, dict):
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
    clerk_id = clerk_user_info.get('sub')
    if not clerk_id:
        return Response({'error': 'Invalid authentication'}, status=status.HTTP_401_UNAUTHORIZED)
        
    try:
        user = ClerkUser.objects.get(clerk_id=clerk_id)
    except ClerkUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get billing history for this user
    history = BillingHistory.objects.filter(user=user).order_by('-created_at')
    serializer = BillingHistorySerializer(history, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_transaction(request):
    """
    Manually verify a transaction's status with Chapa
    Used when the webhook might have failed to update status
    """
    tx_ref = request.query_params.get('tx_ref')
    
    if not tx_ref:
        return Response({'error': 'Missing transaction reference'}, status=status.HTTP_400_BAD_REQUEST)
        
    # Try to find the billing history entry
    try:
        billing = BillingHistory.objects.get(tx_ref=tx_ref)
    except BillingHistory.DoesNotExist:
        return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)
        
    # If already verified as completed, just return success
    if billing.status == 'completed':
        return Response({
            'status': 'success',
            'message': 'Payment already verified',
            'verified': True
        })
        
    # Verify with Chapa API
    verification = verify_payment(tx_ref)
    print(f"[DEBUG] Verification result for {tx_ref}:", verification)
    
    # Check verification result
    if verification.get('status') == 'success':
        # Update payment status
        billing.status = 'completed'
        billing.save()
        
        # Update user's plan if this was a plan payment
        if billing.plan in ['pro', 'organizer']:
            user = billing.user
            user.plan = billing.plan
            user.save(update_fields=['plan'])
            
        return Response({
            'status': 'success', 
            'message': 'Payment verified successfully',
            'verified': True
        })
    else:
        return Response({
            'status': 'pending',
            'message': 'Payment verification pending or failed',
            'verified': False
        })
