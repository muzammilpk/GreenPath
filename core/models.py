from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True, related_name='greenpath_profile')
    name = models.CharField(max_length=100, default='Muzammil')
    eco_score = models.IntegerField(default=94)
    total_co2_saved_g = models.FloatField(default=26400.0) # Saved in grams (e.g. 26.4 kg)
    today_co2_saved_g = models.FloatField(default=800.0)
    total_money_saved_inr = models.FloatField(default=1200.0)
    total_trips = models.IntegerField(default=48)
    favorite_transport = models.CharField(max_length=50, default='Train')
    updated_at = models.DateTimeField(auto_now=True)

    def total_co2_saved_kg(self):
        return round(self.total_co2_saved_g / 1000.0, 1)

    def today_co2_saved_kg(self):
        return round(self.today_co2_saved_g / 1000.0, 1)

    def __str__(self):
        return f"{self.name}'s Profile (Eco Score: {self.eco_score})"

class TransportMode(models.Model):
    MODE_CHOICES = [
        ('walk', 'Walk'),
        ('bike', 'Bike'),
        ('bus', 'Bus'),
        ('train', 'Train'),
        ('car', 'Car'),
    ]
    name = models.CharField(max_length=50)
    mode_code = models.CharField(max_length=20, choices=MODE_CHOICES, unique=True)
    icon = models.CharField(max_length=10) # 🚶 🚴 🚌 🚆 🚗
    co2_per_km_g = models.FloatField() # Grams CO2 per km
    cost_per_km_inr = models.FloatField() # INR per km
    avg_speed_kmh = models.FloatField() # km/h speed
    requires_railway = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.icon} {self.name} ({self.co2_per_km_g}g CO2/km)"

class Trip(models.Model):
    user_profile = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='trips')
    source_name = models.CharField(max_length=255)
    destination_name = models.CharField(max_length=255)
    source_lat = models.FloatField(null=True, blank=True)
    source_lng = models.FloatField(null=True, blank=True)
    dest_lat = models.FloatField(null=True, blank=True)
    dest_lng = models.FloatField(null=True, blank=True)
    
    distance_km = models.FloatField(default=0.0)
    duration_mins = models.IntegerField(default=0)
    travel_time_mins = models.IntegerField(default=0)
    
    selected_mode = models.CharField(max_length=50, default='train') # Mode chosen by user
    baseline_mode = models.CharField(max_length=50, default='Car')
    
    co2_baseline_g = models.FloatField(default=0.0)
    co2_produced_g = models.FloatField(default=0.0)
    co2_saved_g = models.FloatField(default=0.0)
    money_saved_inr = models.FloatField(default=0.0)
    cost_estimate = models.FloatField(default=0.0)
    eco_score = models.IntegerField(default=100)
    
    created_at = models.DateTimeField(auto_now_add=True)


    def co2_saved_kg(self):
        return round(self.co2_saved_g / 1000.0, 2)

    def __str__(self):
        return f"{self.source_name} → {self.destination_name} via {self.selected_mode} ({self.co2_saved_g}g saved)"

