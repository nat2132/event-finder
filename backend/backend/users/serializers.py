from rest_framework import serializers
from .models import ClerkUser
import uuid  # Import for generating unique IDs

class ClerkUserSerializer(serializers.ModelSerializer):
    user_type_display = serializers.SerializerMethodField()
    admin_role_display = serializers.SerializerMethodField()
    plan_display = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    # Add clerk_id field with default value
    clerk_id = serializers.CharField(required=False, default=lambda: f"admin_created_{uuid.uuid4()}")
    
    class Meta:
        model = ClerkUser
        fields = '__all__'
        extra_fields = ['user_type_display', 'admin_role_display', 'plan_display', 'first_name', 'last_name', 'status']
    
    def get_user_type_display(self, obj):
        return dict(ClerkUser.USER_TYPE_CHOICES).get(obj.user_type, '')
        
    def get_admin_role_display(self, obj):
        return dict(ClerkUser.ADMIN_ROLE_CHOICES).get(obj.admin_role, '')
        
    def get_plan_display(self, obj):
        return dict(ClerkUser.PLAN_CHOICES).get(obj.plan, '')
    
    def get_first_name(self, obj):
        # Extract first name from full_name if available
        if obj.full_name:
            parts = obj.full_name.split(maxsplit=1)
            return parts[0] if parts else ""
        return ""
    
    def get_last_name(self, obj):
        # Extract last name from full_name if available
        if obj.full_name:
            parts = obj.full_name.split(maxsplit=1)
            return parts[1] if len(parts) > 1 else ""
        return ""
    
    def get_status(self, obj):
        # Default status field expected by frontend
        return "active"
        
    def validate_email(self, value):
        """
        Check that the email is valid.
        """
        if not value:
            raise serializers.ValidationError("Email is required")
        return value
    
    def validate(self, data):
        """
        Object-level validation to ensure clerk_id is present.
        """
        # Log the validation process for debugging
        print(f"Validate called with data:", data)
        print(f"Self instance:", getattr(self, 'instance', None))
        
        # For creation (when we don't have an instance yet)
        if not self.instance:
            # Generate clerk_id if not provided
            if 'clerk_id' not in data or not data['clerk_id']:
                data['clerk_id'] = f"admin_created_{uuid.uuid4()}"
                print(f"Generated new clerk_id: {data['clerk_id']}")
        
        # For updates of admin-created users, ensure clerk_id isn't being changed
        elif self.instance and self.instance.clerk_id.startswith('admin_created_'):
            print(f"Validating admin-created user: {self.instance.clerk_id}")
            # If trying to change clerk_id, prevent it
            if 'clerk_id' in data and data['clerk_id'] != self.instance.clerk_id:
                print(f"Preventing clerk_id change: {data['clerk_id']} -> {self.instance.clerk_id}")
                # Revert to original clerk_id
                data['clerk_id'] = self.instance.clerk_id
            
        # Ensure email is provided
        if 'email' not in data or not data['email']:
            print(f"Email validation failed: {data.get('email', 'Not Provided')}")
            raise serializers.ValidationError({"email": "Valid email address is required"})
            
        # Generate full_name from email if not provided
        if 'full_name' not in data or not data['full_name']:
            if 'email' in data and data['email']:
                email_username = data['email'].split('@')[0]
                data['full_name'] = email_username.replace('.', ' ').title()
                print(f"Generated full_name from email: {data['full_name']}")
                
        print(f"Validation successful, returning data")
        return data
        
    def create(self, validated_data):
        """
        Create a new user
        """
        return super().create(validated_data)
