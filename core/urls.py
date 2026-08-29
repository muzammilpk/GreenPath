from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('plan/', views.plan_trip, name='plan_trip'),
    path('api/search/', views.api_search_routes, name='api_search_routes'),
    path('api/suggest/', views.api_suggest_locations, name='api_suggest_locations'),
    path('navigation/', views.navigation, name='navigation'),
    path('api/complete-trip/', views.api_complete_trip, name='api_complete_trip'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('reports/', views.reports, name='reports'),
    path('about/', views.about, name='about'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('api/clear-history/', views.api_clear_history, name='api_clear_history'),
]

