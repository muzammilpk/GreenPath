import json

from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User

from .models import UserProfile, Trip
from .services import compute_route_modes, suggest_locations


def get_or_create_profile(request=None):
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        profile, created = UserProfile.objects.get_or_create(
            user=request.user,
            defaults={
                'name': request.user.first_name or request.user.username.capitalize(),
                'eco_score': 95,
                'total_co2_saved_g': 12000.0,
                'today_co2_saved_g': 0.0,
                'total_money_saved_inr': 450.0,
                'total_trips': 5,
                'favorite_transport': 'Train'
            }
        )
        return profile

    profile, created = UserProfile.objects.get_or_create(
        id=1,
        defaults={
            'name': 'Muzammil',
            'eco_score': 94,
            'total_co2_saved_g': 26400.0,
            'today_co2_saved_g': 800.0,
            'total_money_saved_inr': 1200.0,
            'total_trips': 48,
            'favorite_transport': 'Train'
        }
    )

    return profile


def home(request):
    profile = get_or_create_profile(request)

    context = {
        'profile': profile,
        'active_page': 'home',
    }

    return render(request, 'home.html', context)


def plan_trip(request):
    profile = get_or_create_profile(request)

    source = request.GET.get('source', '').strip()
    destination = request.GET.get('destination', '').strip()
    selected_mode = request.GET.get('mode', 'all').strip()

    route_data = None

    # ---------------------------------------------------------
    # No route searched yet
    # Show planner page
    # ---------------------------------------------------------
    if not source or not destination:
        context = {
            'profile': profile,
            'source': source,
            'destination': destination,
            'selected_mode_code': selected_mode,
            'route_data': None,
            'active_page': 'plan',
        }

        return render(
            request,
            'trip/planner.html',
            context
        )

    # ---------------------------------------------------------
    # Source + destination available
    # Calculate routes
    # ---------------------------------------------------------
    route_data = compute_route_modes(
        source,
        destination
    )

    context = {
        'profile': profile,
        'source': source,
        'destination': destination,
        'selected_mode_code': selected_mode,
        'route_data': route_data,
        'active_page': 'plan',
    }

    # IMPORTANT:
    # Keep the user on the planner page.
    # Do not render trip/results.html here.
    return render(
        request,
        'trip/planner.html',
        context
    )


def api_search_routes(request):
    source = request.GET.get('source', '').strip()
    destination = request.GET.get('destination', '').strip()

    if not source or not destination:
        return JsonResponse(
            {
                'error': 'Source and destination are required.'
            },
            status=400
        )

    route_data = compute_route_modes(
        source,
        destination
    )

    return JsonResponse(route_data)


def api_suggest_locations(request):
    query = request.GET.get('q', '').strip()

    if not query or len(query) < 1:
        return JsonResponse({
            'suggestions': []
        })

    suggestions = suggest_locations(query)

    return JsonResponse({
        'suggestions': suggestions
    })


def navigation(request):
    profile = get_or_create_profile(request)

    source = request.GET.get('source', '').strip()
    destination = request.GET.get('destination', '').strip()
    mode_code = request.GET.get('mode', 'train').strip()

    display_source = source if source else 'Kochi'
    display_destination = destination if destination else 'Thrissur'

    src_query = source if source else 'Kochi'
    dest_query = destination if destination else 'Thrissur'

    route_data = compute_route_modes(
        src_query,
        dest_query
    )

    selected_mode = None
    car_mode = None

    for mode in route_data['modes']:

        if mode['code'] == mode_code:
            selected_mode = mode

        if mode['code'] == 'car':
            car_mode = mode

    if not selected_mode:
        selected_mode = route_data['modes'][0]

    if not car_mode:
        car_mode = selected_mode

    co2_saved_g = max(
        0,
        car_mode['carbon_g'] - selected_mode['carbon_g']
    )

    money_saved_inr = max(
        0,
        car_mode['cost_inr'] - selected_mode['cost_inr']
    )

    road_path_json = json.dumps(
        route_data['road_path']
    )

    turn_steps_json = json.dumps(
        route_data['turn_steps']
    )

    train_path_json = (
        json.dumps(route_data['train_path_data'])
        if route_data.get('train_path_data')
        else 'null'
    )

    context = {
        'profile': profile,
        'source': source,
        'destination': destination,
        'display_source': display_source,
        'display_destination': display_destination,
        'route_data': route_data,
        'selected_mode': selected_mode,
        'car_mode': car_mode,
        'co2_saved_g': co2_saved_g,
        'money_saved_inr': money_saved_inr,
        'road_path_json': road_path_json,
        'turn_steps_json': turn_steps_json,
        'train_path_json': train_path_json,
        'active_page': 'navigation',
    }

    return render(
        request,
        'navigation.html',
        context
    )


@csrf_exempt
def api_complete_trip(request):

    if request.method != 'POST':
        return JsonResponse(
            {
                'error': 'POST method required'
            },
            status=405
        )

    try:
        data = json.loads(
            request.body.decode('utf-8')
        )
    except Exception:
        data = request.POST

    source_name = data.get(
        'source',
        'Starting Point'
    )

    dest_name = data.get(
        'destination',
        'Destination'
    )

    selected_mode_name = data.get(
        'selected_mode',
        'Train'
    )

    distance_km = float(
        data.get(
            'distance_km',
            15.0
        )
    )

    duration_mins = int(
        data.get(
            'duration_mins',
            28
        )
    )

    co2_baseline_g = float(
        data.get(
            'co2_baseline_g',
            1450.0
        )
    )

    co2_produced_g = float(
        data.get(
            'co2_produced_g',
            70.0
        )
    )

    co2_saved_g = float(
        data.get(
            'co2_saved_g',
            1380.0
        )
    )

    money_saved_inr = float(
        data.get(
            'money_saved_inr',
            185.0
        )
    )

    profile = get_or_create_profile(request)

    trip = Trip.objects.create(
        user_profile=profile,
        source_name=source_name,
        destination_name=dest_name,
        distance_km=distance_km,
        duration_mins=duration_mins,
        travel_time_mins=duration_mins,
        selected_mode=selected_mode_name,
        baseline_mode='Car',
        co2_baseline_g=co2_baseline_g,
        co2_produced_g=co2_produced_g,
        co2_saved_g=co2_saved_g,
        money_saved_inr=money_saved_inr,
        cost_estimate=money_saved_inr
    )

    profile.total_trips += 1
    profile.total_co2_saved_g += co2_saved_g
    profile.today_co2_saved_g += co2_saved_g
    profile.total_money_saved_inr += money_saved_inr

    trips_count = Trip.objects.filter(
        user_profile=profile
    ).count()

    eco_trips = Trip.objects.filter(
        user_profile=profile,
        co2_saved_g__gt=100
    ).count()

    if trips_count > 0:
        calculated_score = int(
            80 + (eco_trips / trips_count) * 18
        )

        profile.eco_score = min(
            100,
            calculated_score
        )

    profile.save()

    return JsonResponse({
        'status': 'success',
        'trip_id': trip.id,
        'co2_saved_g': co2_saved_g,
        'co2_saved_kg': round(
            co2_saved_g / 1000.0,
            2
        ),
        'money_saved_inr': money_saved_inr,
        'new_eco_score': profile.eco_score,
        'total_co2_saved_kg': profile.total_co2_saved_kg(),
        'total_money_saved_inr': profile.total_money_saved_inr,
        'total_trips': profile.total_trips
    })


def dashboard(request):
    profile = get_or_create_profile(request)

    trips = Trip.objects.filter(
        user_profile=profile
    ).order_by('-created_at')[:20]

    mode_counts = {}

    for trip in trips:
        mode = trip.selected_mode

        mode_counts[mode] = (
            mode_counts.get(mode, 0) + 1
        )

    favorite_transport = profile.favorite_transport

    if mode_counts:
        favorite_transport = max(
            mode_counts,
            key=mode_counts.get
        )

        profile.favorite_transport = favorite_transport
        profile.save()

    context = {
        'profile': profile,
        'trips': trips,
        'mode_counts_json': json.dumps(
            mode_counts
        ),
        'favorite_transport': favorite_transport,
        'active_page': 'dashboard',
    }

    return render(
        request,
        'dashboard.html',
        context
    )


def reports(request):
    profile = get_or_create_profile(request)

    context = {
        'profile': profile,
        'active_page': 'reports',
    }

    return render(
        request,
        'reports.html',
        context
    )


def about(request):
    profile = get_or_create_profile(request)

    context = {
        'profile': profile,
        'active_page': 'about',
    }

    return render(
        request,
        'about.html',
        context
    )


def login_view(request):

    if request.user.is_authenticated:
        return redirect('dashboard')

    error = None

    if request.method == 'POST':

        username_or_email = request.POST.get(
            'username',
            ''
        ).strip()

        password = request.POST.get(
            'password',
            ''
        ).strip()

        user = authenticate(
            request,
            username=username_or_email,
            password=password
        )

        if user is None and '@' in username_or_email:

            try:
                user_obj = User.objects.get(
                    email=username_or_email
                )

                user = authenticate(
                    request,
                    username=user_obj.username,
                    password=password
                )

            except User.DoesNotExist:
                pass

        if user is not None:

            login(request, user)

            return redirect('dashboard')

        else:

            error = (
                "Invalid username or password. "
                "Please check your credentials."
            )

    return render(
        request,
        'login.html',
        {
            'error': error,
            'active_page': 'login'
        }
    )


def register_view(request):

    if request.user.is_authenticated:
        return redirect('dashboard')

    error = None

    if request.method == 'POST':

        username = request.POST.get(
            'username',
            ''
        ).strip()

        email = request.POST.get(
            'email',
            ''
        ).strip()

        password = request.POST.get(
            'password',
            ''
        ).strip()

        confirm_password = request.POST.get(
            'confirm_password',
            ''
        ).strip()

        if not username or not password:

            error = (
                "Username and password are required."
            )

        elif password != confirm_password:

            error = "Passwords do not match."

        elif User.objects.filter(
            username=username
        ).exists():

            error = (
                f"Username '{username}' is already taken. "
                "Please choose another."
            )

        elif email and User.objects.filter(
            email=email
        ).exists():

            error = (
                f"Email '{email}' is already registered."
            )

        else:

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )

            profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'name': username.capitalize(),
                    'eco_score': 100,
                    'total_co2_saved_g': 0.0,
                    'today_co2_saved_g': 0.0,
                    'total_money_saved_inr': 0.0,
                    'total_trips': 0,
                    'favorite_transport': 'Train'
                }
            )

            login(request, user)

            return redirect('dashboard')

    return render(
        request,
        'register.html',
        {
            'error': error,
            'active_page': 'register'
        }
    )


def logout_view(request):

    logout(request)

    return redirect('home')


@csrf_exempt
def api_clear_history(request):

    if request.method == 'POST':

        profile = get_or_create_profile(request)

        Trip.objects.filter(
            user_profile=profile
        ).delete()

        profile.total_trips = 0
        profile.total_co2_saved_g = 0.0
        profile.today_co2_saved_g = 0.0
        profile.total_money_saved_inr = 0.0
        profile.eco_score = 90

        profile.save()

        return JsonResponse({
            'status': 'cleared'
        })

    return JsonResponse(
        {
            'error': 'POST required'
        },
        status=405
    )