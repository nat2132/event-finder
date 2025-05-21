from rest_framework import serializers
from .models import BillingHistory

class BillingHistorySerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    created_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = BillingHistory
        fields = '__all__'
        extra_fields = ['user_email', 'created_at_formatted']
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else None
        
    def get_created_at_formatted(self, obj):
        return obj.created_at.strftime("%Y-%m-%d %H:%M:%S")
