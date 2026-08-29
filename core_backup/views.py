from django.shortcuts import render


def home(request):
    return render(request, "core/home.html")


def planner(request):
    return render(request, "trip/planner.html")