from rest_framework import serializers
from .models import NotificationSettings, AdminNotification, UserNotification

class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSettings
        fields = '__all__'
        read_only_fields = ['user']

class AdminNotificationSerializer(serializers.ModelSerializer):
    timestamp_formatted = serializers.SerializerMethodField()
    notification_type_display = serializers.SerializerMethodField()
    target_role_display = serializers.SerializerMethodField()
    actor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AdminNotification
        fields = '__all__'
        extra_fields = ['timestamp_formatted', 'notification_type_display', 'target_role_display', 'actor_name']
    
    def get_timestamp_formatted(self, obj):
        return obj.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        
    def get_notification_type_display(self, obj):
        return obj.get_notification_type_display()
    
    def get_target_role_display(self, obj):
        return obj.get_target_role_display()
        
    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.full_name or obj.actor.email
        return None

class UserNotificationSerializer(serializers.ModelSerializer):
    created_at_formatted = serializers.SerializerMethodField()
    notification_type_display = serializers.SerializerMethodField()
    
    class Meta:
        model = UserNotification
        fields = '__all__'
        extra_fields = ['created_at_formatted', 'notification_type_display']
    
    def get_created_at_formatted(self, obj):
        return obj.created_at.strftime("%Y-%m-%d %H:%M:%S")
        
    def get_notification_type_display(self, obj):
        return obj.get_notification_type_display()
