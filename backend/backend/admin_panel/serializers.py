from rest_framework import serializers
from .models import AdminDashboardStat, AdminActionLog
from users.models import ClerkUser

class AdminDashboardStatSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminDashboardStat
        fields = '__all__'

class AdminActionLogSerializer(serializers.ModelSerializer):
    admin_user_email = serializers.SerializerMethodField()
    admin_user_full_name = serializers.SerializerMethodField()
    action_type_display = serializers.SerializerMethodField()
    
    class Meta:
        model = AdminActionLog
        fields = '__all__'
        extra_fields = ['admin_user_email', 'admin_user_full_name', 'action_type_display']
    
    def get_admin_user_email(self, obj):
        return obj.admin_user.email if obj.admin_user else None
        
    def get_admin_user_full_name(self, obj):
        return obj.admin_user.full_name if obj.admin_user else None
        
    def get_action_type_display(self, obj):
        return obj.get_action_type_display()

class AdminUserSerializer(serializers.ModelSerializer):
    user_type_display = serializers.SerializerMethodField()
    admin_role_display = serializers.SerializerMethodField()
    plan_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ClerkUser
        fields = [
            'id', 'clerk_id', 'email', 'full_name', 'provider', 'profile_image',
            'plan', 'plan_display', 'user_type', 'user_type_display', 
            'admin_role', 'admin_role_display', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Custom create method to generate a unique clerk_id if not provided"""
        import uuid
        # Generate a clerk ID if not provided
        if 'clerk_id' not in validated_data or not validated_data['clerk_id']:
            validated_data['clerk_id'] = f"admin_{uuid.uuid4()}"
        
        # Ensure user_type is admin
        validated_data['user_type'] = ClerkUser.USER_TYPE_ADMIN
        
        # Set default values if not provided
        if 'provider' not in validated_data or not validated_data['provider']:
            validated_data['provider'] = 'internal'
        
        return super().create(validated_data)
    
    def get_user_type_display(self, obj):
        return dict(ClerkUser.USER_TYPE_CHOICES).get(obj.user_type, '')
        
    def get_admin_role_display(self, obj):
        return dict(ClerkUser.ADMIN_ROLE_CHOICES).get(obj.admin_role, '')
        
    def get_plan_display(self, obj):
        return dict(ClerkUser.PLAN_CHOICES).get(obj.plan, '')
