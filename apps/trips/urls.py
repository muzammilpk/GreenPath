from django.urls import path
from .views import planner

urlpatterns = [
    path("", planner, name="planner"),
]