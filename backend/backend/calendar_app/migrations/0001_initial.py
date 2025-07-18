# Generated by Django 5.2 on 2025-05-18 13:26

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CalendarEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('date', models.DateTimeField()),
                ('duration_minutes', models.PositiveIntegerField(default=60)),
                ('location', models.CharField(max_length=255)),
                ('category', models.CharField(max_length=64)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='calendar_events', to='users.clerkuser')),
            ],
        ),
    ]
