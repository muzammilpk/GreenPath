import json
from django.test import TestCase, Client
from django.urls import reverse
from .models import UserProfile, Trip
from .services import compute_route_modes, is_railway_available, geocode_location

class GreenPathServicesTest(TestCase):
    def test_kochi_thrissur_route(self):
        """Test Kochi to Thrissur benchmark route with train available."""
        result = compute_route_modes('Kochi', 'Thrissur')
        self.assertTrue(result['rail_available'])
        
        mode_codes = [m['code'] for m in result['modes']]
        self.assertIn('train', mode_codes)
        self.assertIn('car', mode_codes)
        self.assertIn('bus', mode_codes)
        
        # Verify train is marked as eco best
        train_mode = next(m for m in result['modes'] if m['code'] == 'train')
        self.assertTrue(train_mode['is_best'])
        self.assertEqual(train_mode['carbon_g'], 2230)
        
        car_mode = next(m for m in result['modes'] if m['code'] == 'car')
        self.assertEqual(car_mode['carbon_g'], 12630)

    def test_wayanad_no_railway_route(self):
        """Test Kochi to Wayanad route where train network is unavailable."""
        result = compute_route_modes('Kochi', 'Wayanad')
        self.assertFalse(result['rail_available'])
        
        mode_codes = [m['code'] for m in result['modes']]
        self.assertNotIn('train', mode_codes)
        self.assertIn('bus', mode_codes)
        self.assertIn('car', mode_codes)

    def test_idukki_no_railway_route(self):
        """Test Kochi to Idukki route where train network is unavailable."""
        result = compute_route_modes('Kochi', 'Idukki')
        self.assertFalse(result['rail_available'])
        mode_codes = [m['code'] for m in result['modes']]
        self.assertNotIn('train', mode_codes)

class GreenPathViewsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.profile = UserProfile.objects.create(
            name='Muzammil',
            eco_score=94,
            total_co2_saved_g=26400.0,
            today_co2_saved_g=800.0,
            total_money_saved_inr=1200.0,
            total_trips=48
        )

    def test_home_view(self):
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'GreenPath')
        self.assertContains(response, 'Travel Green. Travel Smart.')

    def test_api_search(self):
        response = self.client.get(reverse('api_search_routes'), {'source': 'Kochi', 'destination': 'Thrissur'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['rail_available'])
        self.assertEqual(len(data['modes']), 4)

    def test_navigation_view(self):
        response = self.client.get(reverse('navigation'), {'source': 'Kochi', 'destination': 'Thrissur', 'mode': 'train'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Navigation')
        self.assertContains(response, 'Train')

    def test_api_complete_trip(self):
        payload = {
            'source': 'Kochi',
            'destination': 'Thrissur',
            'selected_mode': 'Train',
            'distance_km': 68.0,
            'duration_mins': 81,
            'co2_baseline_g': 12630.0,
            'co2_produced_g': 2230.0,
            'co2_saved_g': 10400.0,
            'money_saved_inr': 632.0
        }
        response = self.client.post(
            reverse('api_complete_trip'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['co2_saved_g'], 10400.0)

    def test_dashboard_view(self):
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Eco Score')
        self.assertContains(response, '94')
