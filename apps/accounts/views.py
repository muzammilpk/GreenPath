from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import authenticate, login
from .forms import RegisterForm, LoginForm
from django.contrib.auth.decorators import login_required
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

    if request.method == "POST":

        form = LoginForm(request, data=request.POST)

        if form.is_valid():

            username = form.cleaned_data.get("username")
            password = form.cleaned_data.get("password")

            user = authenticate(
                username=username,
                password=password,
            )

            if user is not None:

                login(request, user)

                return redirect("profile")

    else:

        form = LoginForm()

    return render(
        request,
        "authentication/login.html",
        {"form": form},
    )

@login_required
def profile_view(request):
    return render(request, "authentication/profile.html")

def profile_view(request):
    return render(request, "authentication/profile.html")