from django.db import models
from django.contrib.auth.models import User


class Trip(models.Model):

    TRANSPORT_CHOICES = [
        ("walk", "Walking"),
        ("cycle", "Bicycle"),
        ("bike", "Bike"),
        ("bus", "Bus"),
        ("train", "Train"),
        ("car", "Car"),
        
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    source = models.CharField(max_length=255)

    destination = models.CharField(max_length=255)

    transport = models.CharField(
        max_length=20,
        choices=TRANSPORT_CHOICES
    )

    distance = models.FloatField()

    duration = models.IntegerField(
        help_text="Duration in minutes"
    )

    cost = models.DecimalField(
        max_digits=8,
        decimal_places=2
    )

    carbon_emission = models.FloatField(
        help_text="CO₂ in grams"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.source} → {self.destination}"