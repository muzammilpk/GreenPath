from django.shortcuts import render, redirect
from django.contrib import messages

from .forms import RegisterForm


def register_view(request):

    if request.method == "POST":

        form = RegisterForm(request.POST)

        if form.is_valid():

            form.save()

            messages.success(request, "Account created successfully!")

            return redirect("login")

    else:

        form = RegisterForm()

    return render(
        request,
        "authentication/register.html",
        {"form": form},
    )


def login_view(request):
    return render(request, "authentication/login.html")


def profile_view(request):
    return render(request, "authentication/profile.html")