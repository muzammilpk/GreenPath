from django.shortcuts import render
from .forms import TripPlannerForm


def planner(request):

    form = TripPlannerForm()

    return render(
        request,
        "trip/planner.html",
        {"form": form},
    )